import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { saveProfile } from '../lib/supabaseQueries.js'
import { LOAD_STATE, SAVE } from '../store/cardStore.js'

/** Collect all blob URLs from state (cards + bio avatar) */
function collectBlobUrls(state) {
  const urls = []

  for (const section of state.sections || []) {
    for (const card of section.cards || []) {
      const imgUrl = card.content?.imageUrl
      if (imgUrl && imgUrl.startsWith('blob:')) urls.push(imgUrl)
      const vidUrl = card.content?.videoUrl
      if (vidUrl && vidUrl.startsWith('blob:')) urls.push(vidUrl)
    }
  }

  if (state.bio?.avatar?.startsWith('blob:')) {
    urls.push(state.bio.avatar)
  }

  return urls
}

/** Upload a blob URL to Supabase Storage and return the public URL */
async function uploadBlob(blobUrl, userId) {
  const res = await fetch(blobUrl)
  const blob = await res.blob()
  const ext = blob.type.split('/')[1]?.split(';')[0] || 'bin'
  const isVideo = blob.type.startsWith('video/')
  const folder = isVideo ? 'videos' : 'images'
  const prefix = isVideo ? 'vid' : 'img'
  const fileName = `${userId}/${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

  const { error } = await supabase.storage
    .from('bento-assets')
    .upload(fileName, blob, { contentType: blob.type, upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('bento-assets')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

/** Replace blob URLs in config with Supabase public URLs */
function replaceUrls(config, urlMap) {
  const json = JSON.stringify(config)
  let result = json
  for (const [blobUrl, publicUrl] of Object.entries(urlMap)) {
    result = result.replaceAll(blobUrl, publicUrl)
  }
  return JSON.parse(result)
}

export function usePersistence(state, dispatch, profileData, profileUserId) {
  // Load saved state from profileData on first mount
  useEffect(() => {
    if (profileData) {
      dispatch({ type: LOAD_STATE, payload: profileData })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback(async () => {
    if (!profileUserId) return

    try {
      // Collect blob URLs and upload to Supabase Storage
      const blobUrls = collectBlobUrls(state)
      const urlMap = {}
      for (const url of blobUrls) {
        urlMap[url] = await uploadBlob(url, profileUserId)
      }

      // Build state snapshot with public URLs
      const stateSnapshot = {
        sections: state.sections,
        bio: state.bio,
        gridConfig: state.gridConfig,
      }
      const finalState = Object.keys(urlMap).length > 0
        ? replaceUrls(stateSnapshot, urlMap)
        : stateSnapshot

      // Save to relational tables
      await saveProfile(profileUserId, finalState)

      // Reload state with public URLs so editor shows them
      dispatch({ type: LOAD_STATE, payload: finalState })
      dispatch({ type: SAVE })
    } catch (err) {
      console.error('Publish failed:', err)
    }
  }, [state.sections, state.bio, state.gridConfig, dispatch, profileUserId])

  return { save }
}
