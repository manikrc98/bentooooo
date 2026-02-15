import { useEffect, useCallback } from 'react'
import { LOAD_STATE, SAVE } from '../store/cardStore.js'
import { downloadHTML } from '../utils/exportLayout.js'

const STORAGE_KEY = 'bento_builder_state_v2'

export function usePersistence(state, dispatch) {
  // Load saved state on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        dispatch({ type: LOAD_STATE, payload: parsed })
      }
    } catch {
      // Corrupt data — ignore and start fresh
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback(() => {
    const payload = {
      sections: state.sections,
      gridConfig: state.gridConfig,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    dispatch({ type: SAVE })
  }, [state.sections, state.gridConfig, dispatch])

  const exportHTML = useCallback(() => {
    const allCards = state.sections.flatMap(s => s.cards)
    downloadHTML(allCards, state.gridConfig)
  }, [state.sections, state.gridConfig])

  return { save, exportHTML }
}
