/**
 * One-time migration: uploads exportBento assets to Supabase Storage
 * and populates the relational tables (sections, cards, bios, bio_blocks).
 *
 * Usage:
 *   node migrate-assets.mjs <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Prerequisites:
 *   1. Create a PUBLIC bucket called "bento-assets" in Supabase Dashboard → Storage
 *   2. Run the SQL to create sections, cards, bios, bio_blocks tables
 *   3. Get the service role key from Supabase Dashboard → Settings → API
 *   4. Asset files extracted to /tmp/bento-migration/ (done by git show)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://usugahdzktspxivbedsa.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node migrate-assets.mjs <SUPABASE_SERVICE_ROLE_KEY>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── 1. Find user profile ────────────────────────────────────────────────────
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('username', 'manikrc98')
  .single()

if (profileError || !profile) {
  console.error('Profile not found for manikrc98:', profileError?.message)
  process.exit(1)
}

const userId = profile.id
console.log(`Found profile: ${profile.username} (${userId})`)

// ── 2. Original data from exportBento ────────────────────────────────────────
const originalData = {
  sections: [
    {
      title: "\u2724 Live Work",
      cards: [
        { bento: "2x2", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771216718444.mp4", text: "", title: "CC Rewards for Millenials and GenZ", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "https://medium.com/@manikc.design/5e9e06d86a1d" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771216718447.png", videoUrl: "", text: "", title: "Developers API Playground", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "https://www.figma.com/proto/1pWbIxX0G1eP7U9Pkx7BAb/Porfolio-Projects?node-id=10-13722" } },
        { bento: "2x2", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771216718447.quicktime", text: "", title: "Increased WAU for Personal Finance", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "https://www.figma.com/proto/1pWbIxX0G1eP7U9Pkx7BAb/Porfolio-Projects?node-id=1-2637" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771216718449.png", videoUrl: "", text: "", title: "Boring T&C \u27a1\ufe0f Eye candy", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "https://compliance.fusion.tech/" } }
      ]
    },
    {
      title: "\ud83c\udfc4\ud83c\udffb\u200d\u2642\ufe0f Fun Projects",
      cards: [
        { bento: "1x2", content: { type: "image", imageUrl: "/api/assets/img-1771216923689.png", videoUrl: "", text: "", title: "Figma Plugin", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "https://www.figma.com/community/plugin/990910408295947511/lazy-load" } },
        { bento: "2x2", content: { type: "image", imageUrl: "/api/assets/img-1771216923690.png", videoUrl: "", text: "", title: "Crash Course", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "https://www.youtube.com/watch?v=t-KUccBqDVA&list=PLBbdXny7GpJQDhFeM75lS_Fh-LUwmRmOP" } },
        { bento: "1x2", content: { type: "image", imageUrl: "/api/assets/img-1771216923690.png", videoUrl: "", text: "", title: "Initiative", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "https://the-thank-tank.web.app/" } }
      ]
    },
    {
      title: "\u2726 Dope Visuals, Made in Figma",
      cards: [
        { bento: "1x2", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771217035659.quicktime", text: "", title: "Money Wrapped", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "https://www.figma.com/proto/r8bqWSgjogiyJIKid4NDbl/Jupiter-Wrapped-2023?node-id=1-36" } },
        { bento: "2x2", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771217035664.mp4", text: "", title: "Gratitude Initiative", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "https://the-thank-tank.web.app/" } },
        { bento: "1x2", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771217035669.mp4", text: "", title: "CC Pitch", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "https://www.figma.com/proto/r8bqWSgjogiyJIKid4NDbl/Jupiter-Projects?node-id=13-4270" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217216078.png", videoUrl: "", text: "", title: "Sodexo Spain", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "https://manikchugh.xyz/#" } },
        { bento: "1x1", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771217216079.quicktime", text: "", title: "Virtual Cards", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "https://www.figma.com/proto/HhIxSOjDB96eCMnPlqfnsl/Manik-Chugh's-Portfolio?node-id=1-443" } }
      ]
    },
    {
      title: "\ud83d\udcbc Worked at",
      cards: [
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217216086.png", videoUrl: "", text: "", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217224945.png", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217216087.png", videoUrl: "", text: "", title: "", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } }
      ]
    },
    {
      title: "\ud83c\udf0a In 2023, I Learnt to",
      cards: [
        { bento: "1x1", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771217448459.mp4", text: "", title: "\ud83c\udfb8 Guitar", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217448461.png", videoUrl: "", text: "", title: "\ud83c\uddef\ud83c\uddf5 Japanese", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/assets/img-1771219007922.jpg", videoUrl: "", text: "", title: "\u2708\ufe0f Solo", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217448462.jpg", videoUrl: "", text: "", title: "\ud83d\ude97 Drive", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217448464.jpg", videoUrl: "", text: "", title: "\ud83c\udfa8 Paint", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } }
      ]
    },
    {
      title: "\ud83c\udfc6 Proud of",
      cards: [
        { bento: "2x2", content: { type: "image", imageUrl: "/api/assets/img-1771217525467.png", videoUrl: "", text: "", title: "\ud83c\udf1f Shining Star, Dec 2020", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } },
        { bento: "1x2", content: { type: "image", imageUrl: "/api/assets/img-1771217525468.jpg", videoUrl: "", text: "", title: "Public Speaking", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217525469.jpg", videoUrl: "", text: "", title: "Performance Award", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217567917.png", videoUrl: "", text: "", title: "Design Mentoring", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "https://www.figma.com/proto/Ygz6ORekIMMnTngeQVQHVh/Visual-%E0%A4%AA%E0%A4%BE%E0%A4%A0---Home-File?node-id=10-5" } },
        { bento: "2x1", content: { type: "video", imageUrl: "", videoUrl: "/api/assets/vid-1771217567918.quicktime", text: "", title: "38,840+ Plugin Downloads", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "https://www.figma.com/community/plugin/990910408295947511/lazy-load" } }
      ]
    },
    {
      title: "\ud83d\udcf8 Hand clicked",
      cards: [
        { bento: "2x2", content: { type: "image", imageUrl: "/api/assets/img-1771217695122.jpg", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217695123.jpg", videoUrl: "", text: "", title: "", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217695123.jpg", videoUrl: "", text: "", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771217695128.jpg", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } }
      ]
    },
    {
      title: " Graphic",
      cards: [
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217695131.png", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } },
        { bento: "2x2", content: { type: "image", imageUrl: "/api/assets/img-1771217695136.png", videoUrl: "", text: "", title: "", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217695132.png", videoUrl: "", text: "", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } }
      ]
    },
    {
      title: "\ud83d\udcac Words Matter",
      cards: [
        { bento: "2x2", content: { type: "image", imageUrl: "/api/assets/img-1771217843044.png", videoUrl: "", text: "", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217843045.png", videoUrl: "", text: "", title: "", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217843045.png", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771217843046.png", videoUrl: "", text: "", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } }
      ]
    },
    {
      title: "\ud83d\udcda Enjoyed Reading",
      cards: [
        { bento: "2x2", content: { type: "image", imageUrl: "/api/assets/img-1771218177755.png", videoUrl: "", text: "", title: "", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771218177757.png", videoUrl: "", text: "", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "" } },
        { bento: "1x1", content: { type: "image", imageUrl: "/api/assets/img-1771218177758.png", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "" } }
      ]
    },
    {
      title: "\ud83d\udd17 Important Links",
      cards: [
        { bento: "2x1", content: { type: "text", imageUrl: "", videoUrl: "", text: "\ud83d\udcc4 Resume", title: "", bgColor: "#f5e6d3", textColor: "#374151", linkUrl: "https://drive.google.com/file/d/1xxDrL2pL7HcLcTfpJWt2JGT9ypnv0YxW/view" } },
        { bento: "2x1", content: { type: "image", imageUrl: "/api/assets/img-1771218499939.png", videoUrl: "", text: "", title: "", bgColor: "#fce8c3", textColor: "#374151", linkUrl: "manikc.design@gmail.com" } },
        { bento: "4x1", content: { type: "text", imageUrl: "", videoUrl: "", text: "Thanks for taking out time to go through my Portfolio! I appreciate that \u2764\ufe0f", title: "", bgColor: "#d3e4cd", textColor: "#374151", linkUrl: "" } }
      ]
    }
  ],
  bio: {
    avatar: "/api/assets/img-1771216327209.png",
    name: "Manik Chugh",
    description: "Senior visual designer @ Moveworks\nPrev at Jupiter, Zeta, Headout",
    blocks: [
      { heading: "Brings to the table", body: "\u2728 Delightful Visuals\n\ud83d\udcc5 5yrs experience of Building consumer apps\n\ud83d\udcac User Interview Skills" },
      { heading: "Loves to", body: "\ud83d\udd2d Chat about cosmos\n\ud83c\udfb8 Play Guitar\n\ud83d\udc7e Develop Figma Plugins" },
      { heading: "Contact", body: "\u2709\ufe0f manikc.design@gmail.com\n\ud83d\udcde 73598 80791" },
      { heading: "Social", body: "LinkedIN\nTwitter\nInstagram" }
    ]
  },
  gridConfig: { columns: 4, cellGap: 8, aspectRatio: 1 }
}

// ── 3. Collect all unique asset URLs and upload ──────────────────────────────
function extractFilename(url) {
  if (!url) return null
  const match = url.match(/(?:\/api)?\/assets\/(.+)$/)
  return match ? match[1] : null
}

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  mp4: 'video/mp4',
  quicktime: 'video/quicktime',
  webm: 'video/webm',
}

// Collect all unique asset URLs
const assetUrls = new Map()
for (const section of originalData.sections) {
  for (const card of section.cards) {
    const imgFile = extractFilename(card.content.imageUrl)
    if (imgFile) assetUrls.set(card.content.imageUrl, imgFile)
    const vidFile = extractFilename(card.content.videoUrl)
    if (vidFile) assetUrls.set(card.content.videoUrl, vidFile)
  }
}
const avatarFile = extractFilename(originalData.bio.avatar)
if (avatarFile) assetUrls.set(originalData.bio.avatar, avatarFile)

console.log(`\nFound ${assetUrls.size} unique assets to upload\n`)

// Upload each asset and build URL map
const urlMap = {}
let uploaded = 0
let failed = 0

for (const [originalUrl, filename] of assetUrls) {
  const localPath = `/tmp/bento-migration/${filename}`
  const ext = filename.split('.').pop()
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
  const isVideo = contentType.startsWith('video/')
  const folder = isVideo ? 'videos' : 'images'
  const storagePath = `${userId}/${folder}/${filename}`

  try {
    const fileData = readFileSync(localPath)
    const { error } = await supabase.storage
      .from('bento-assets')
      .upload(storagePath, fileData, { contentType, upsert: true })

    if (error) {
      console.error(`  FAIL ${filename}: ${error.message}`)
      failed++
      continue
    }

    const { data: urlData } = supabase.storage
      .from('bento-assets')
      .getPublicUrl(storagePath)

    urlMap[originalUrl] = urlData.publicUrl
    uploaded++
    console.log(`  [${uploaded}/${assetUrls.size}] ${folder}/${filename}`)
  } catch (err) {
    console.error(`  FAIL ${filename}: ${err.message}`)
    failed++
  }
}

console.log(`\nUploaded: ${uploaded}, Failed: ${failed}`)
if (failed > 0) {
  console.error('Some uploads failed. Fix issues and re-run.')
  process.exit(1)
}

// Helper: resolve asset URL
function resolveUrl(url) {
  return urlMap[url] || url || ''
}

// ── 4. Update grid config on profiles ────────────────────────────────────────
console.log('\nUpdating grid config on profile...')
const { error: gridErr } = await supabase
  .from('profiles')
  .update({
    grid_columns: originalData.gridConfig.columns,
    grid_cell_gap: originalData.gridConfig.cellGap,
    grid_aspect_ratio: originalData.gridConfig.aspectRatio,
    updated_at: new Date().toISOString(),
  })
  .eq('id', userId)

if (gridErr) {
  console.error('Failed to update grid config:', gridErr.message)
  process.exit(1)
}

// ── 5. Insert sections ──────────────────────────────────────────────────────
console.log('Inserting sections...')
const sectionRows = originalData.sections.map((s, i) => ({
  id: randomUUID(),
  profile_id: userId,
  title: s.title,
  sort_order: i,
}))

const { error: secErr } = await supabase.from('sections').insert(sectionRows)
if (secErr) {
  console.error('Failed to insert sections:', secErr.message)
  process.exit(1)
}
console.log(`  Inserted ${sectionRows.length} sections`)

// ── 6. Insert cards ─────────────────────────────────────────────────────────
console.log('Inserting cards...')
const cardRows = []
for (let si = 0; si < originalData.sections.length; si++) {
  const section = originalData.sections[si]
  const sectionId = sectionRows[si].id
  for (let ci = 0; ci < section.cards.length; ci++) {
    const card = section.cards[ci]
    cardRows.push({
      id: randomUUID(),
      section_id: sectionId,
      bento: card.bento,
      sort_order: ci,
      content_type: card.content.type,
      image_url: resolveUrl(card.content.imageUrl),
      video_url: resolveUrl(card.content.videoUrl),
      text_body: card.content.text || '',
      title: card.content.title || '',
      bg_color: card.content.bgColor,
      text_color: card.content.textColor,
      link_url: card.content.linkUrl || '',
    })
  }
}

const { error: cardErr } = await supabase.from('cards').insert(cardRows)
if (cardErr) {
  console.error('Failed to insert cards:', cardErr.message)
  process.exit(1)
}
console.log(`  Inserted ${cardRows.length} cards`)

// ── 7. Insert bio ───────────────────────────────────────────────────────────
console.log('Inserting bio...')
const bioId = randomUUID()
const { error: bioErr } = await supabase.from('bios').insert({
  id: bioId,
  profile_id: userId,
  avatar_url: resolveUrl(originalData.bio.avatar),
  name: originalData.bio.name,
  description: originalData.bio.description,
})
if (bioErr) {
  console.error('Failed to insert bio:', bioErr.message)
  process.exit(1)
}

// ── 8. Insert bio blocks ────────────────────────────────────────────────────
console.log('Inserting bio blocks...')
const blockRows = originalData.bio.blocks.map((b, i) => ({
  id: randomUUID(),
  bio_id: bioId,
  heading: b.heading,
  body: b.body,
  sort_order: i,
}))

const { error: blockErr } = await supabase.from('bio_blocks').insert(blockRows)
if (blockErr) {
  console.error('Failed to insert bio blocks:', blockErr.message)
  process.exit(1)
}
console.log(`  Inserted ${blockRows.length} bio blocks`)

console.log('\n=== Migration complete! ===')
console.log(`Visit https://manikchugh.xyz/${profile.username} to see your portfolio.`)
