import { useEffect, useCallback } from 'react'
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

/** Fetch a blob URL and return base64 + metadata */
async function blobToBase64(blobUrl) {
  const res = await fetch(blobUrl)
  const blob = await res.blob()
  const buffer = await blob.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
  const isVideo = blob.type.startsWith('video/')
  return { data: base64, type: blob.type, name: isVideo ? 'vid' : 'img' }
}

export function usePersistence(state, dispatch) {
  // Load saved state on first mount
  useEffect(() => {
    fetch('/api/load')
      .then(res => res.json())
      .then(data => {
        if (data) {
          dispatch({ type: LOAD_STATE, payload: data })
        }
      })
      .catch(() => {
        // Server not available — start fresh
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback(async () => {
    try {
      // Collect blob URLs and convert to base64
      const blobUrls = collectBlobUrls(state)
      const images = {}
      for (const url of blobUrls) {
        images[url] = await blobToBase64(url)
      }

      const payload = {
        sections: state.sections,
        bio: state.bio,
        gridConfig: state.gridConfig,
      }

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: payload, images }),
      })

      const updatedState = await res.json()
      dispatch({ type: LOAD_STATE, payload: updatedState })
      dispatch({ type: SAVE })
    } catch (err) {
      console.error('Save failed:', err)
    }
  }, [state.sections, state.bio, state.gridConfig, dispatch])

  return { save }
}
