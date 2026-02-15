import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EXPORT_DIR = path.join(ROOT, 'exportBento')
const DATA_FILE = path.join(EXPORT_DIR, 'src', 'data.json')
const ASSETS_DIR = path.join(EXPORT_DIR, 'public', 'assets')

function ensureDirs() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.mkdirSync(ASSETS_DIR, { recursive: true })
}

/** Collect all image URL strings from the state object */
function collectImageUrls(state) {
  const urls = new Set()

  // Card images
  if (state.sections) {
    for (const section of state.sections) {
      for (const card of section.cards || []) {
        if (card.content?.imageUrl) urls.add(card.content.imageUrl)
      }
    }
  }

  // Bio avatar
  if (state.bio?.avatar) urls.add(state.bio.avatar)

  return urls
}

/** Replace image URLs in state, mutating in place */
function replaceUrls(state, urlMap) {
  if (state.sections) {
    for (const section of state.sections) {
      for (const card of section.cards || []) {
        if (card.content?.imageUrl && urlMap.has(card.content.imageUrl)) {
          card.content.imageUrl = urlMap.get(card.content.imageUrl)
        }
      }
    }
  }

  if (state.bio?.avatar && urlMap.has(state.bio.avatar)) {
    state.bio.avatar = urlMap.get(state.bio.avatar)
  }
}

/** Transform /assets/... paths to /api/assets/... for the editor */
function transformForEditor(state) {
  const clone = JSON.parse(JSON.stringify(state))

  if (clone.sections) {
    for (const section of clone.sections) {
      for (const card of section.cards || []) {
        if (card.content?.imageUrl?.startsWith('/assets/')) {
          card.content.imageUrl = '/api' + card.content.imageUrl
        }
      }
    }
  }

  if (clone.bio?.avatar?.startsWith('/assets/')) {
    clone.bio.avatar = '/api' + clone.bio.avatar
  }

  return clone
}

export function apiPlugin() {
  return {
    name: 'bento-api',
    configureServer(server) {
      // ── POST /api/save ──────────────────────────────────────────
      server.middlewares.use('/api/save', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        for await (const chunk of req) body += chunk
        const { state, images } = JSON.parse(body)

        ensureDirs()

        // Save images and build URL mapping
        const urlMap = new Map()
        if (images) {
          for (const [blobUrl, img] of Object.entries(images)) {
            const ext = img.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
            const filename = `${img.name || 'img'}-${Date.now()}.${ext}`
            const filePath = path.join(ASSETS_DIR, filename)
            const buffer = Buffer.from(img.data, 'base64')
            fs.writeFileSync(filePath, buffer)
            urlMap.set(blobUrl, `/assets/${filename}`)
          }
        }

        // Replace blob URLs with saved asset paths (leave existing /assets/ paths as-is)
        replaceUrls(state, urlMap)

        // Write state to data.json
        const dataToSave = {
          sections: state.sections,
          bio: state.bio || null,
          gridConfig: state.gridConfig,
          savedAt: new Date().toISOString(),
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2))

        // Return state with editor-friendly URLs
        const editorState = transformForEditor(dataToSave)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(editorState))
      })

      // ── GET /api/load ───────────────────────────────────────────
      server.middlewares.use('/api/load', (req, res, next) => {
        if (req.method !== 'GET') return next()

        if (!fs.existsSync(DATA_FILE)) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(null))
          return
        }

        const raw = fs.readFileSync(DATA_FILE, 'utf-8')
        const data = JSON.parse(raw)
        const editorState = transformForEditor(data)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(editorState))
      })

      // ── GET /api/assets/* ───────────────────────────────────────
      server.middlewares.use('/api/assets', (req, res, next) => {
        const filePath = path.join(ASSETS_DIR, req.url.replace(/^\//, ''))
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        const ext = path.extname(filePath).slice(1)
        const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}
