import { useReducer, useState } from 'react'
import { reducer, initialState, REMOVE_CARD, RESIZE_CARD, RESET_STATE } from './store/cardStore.js'
import { useCardSelection } from './hooks/useCardSelection.js'
import { usePersistence } from './hooks/usePersistence.js'
import TopBar from './components/TopBar.jsx'
import BentoCanvas from './components/BentoCanvas.jsx'
import FloatingTray from './components/FloatingTray.jsx'
import BioSection from './components/BioSection.jsx'
import ResetConfirmModal from './components/ResetConfirmModal.jsx'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { mode, sections, selectedCardId, isDirty, bio } = state
  const [showResetModal, setShowResetModal] = useState(false)

  const { handleSelect } = useCardSelection(dispatch, mode)
  const { save } = usePersistence(state, dispatch)

  // Find selected card across all sections
  const selectedCard = selectedCardId
    ? sections.flatMap(s => s.cards).find(c => c.id === selectedCardId) ?? null
    : null

  function handleResize(id, bento) {
    dispatch({ type: RESIZE_CARD, payload: { id, bento } })
  }

  function handleRemove(id) {
    dispatch({ type: REMOVE_CARD, payload: id })
  }

  function handleResetConfirm() {
    dispatch({ type: RESET_STATE })
    setShowResetModal(false)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-zinc-800 overflow-hidden">
      <TopBar
        mode={mode}
        isDirty={isDirty}
        onSave={save}
        onReset={() => setShowResetModal(true)}
        dispatch={dispatch}
      />

      {showResetModal && (
        <ResetConfirmModal
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetModal(false)}
        />
      )}

      <div className="flex-1 flex min-h-0 overflow-y-auto px-6 py-6 relative">
        <BioSection bio={bio} mode={mode} dispatch={dispatch} />

        <BentoCanvas
          state={state}
          dispatch={dispatch}
          selectedCardId={selectedCardId}
          onCardSelect={handleSelect}
        />
      </div>

      <FloatingTray
        selectedCard={mode === 'edit' ? selectedCard : null}
        onResize={handleResize}
        onRemove={handleRemove}
        dispatch={dispatch}
      />
    </div>
  )
}
