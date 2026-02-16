import { useReducer, useState } from 'react'
import { reducer, initialState, REMOVE_CARD, RESET_STATE } from './store/cardStore.js'
import { useCardSelection } from './hooks/useCardSelection.js'
import { usePersistence } from './hooks/usePersistence.js'
import { useAuth } from './contexts/AuthContext.jsx'
import TopBar from './components/TopBar.jsx'
import BentoCanvas from './components/BentoCanvas.jsx'
import FloatingTray from './components/FloatingTray.jsx'
import BioSection from './components/BioSection.jsx'
import ResetConfirmModal from './components/ResetConfirmModal.jsx'

export default function App({ profileData, isOwner, username, profileUserId }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { mode, sections, selectedCardId, isDirty, bio } = state
  const [showResetModal, setShowResetModal] = useState(false)

  const { user, signInWithGoogle, signOut } = useAuth()

  // Non-owners always see preview mode
  const effectiveMode = isOwner ? mode : 'preview'

  const { handleSelect } = useCardSelection(dispatch, effectiveMode)
  const { save } = usePersistence(state, dispatch, profileData, profileUserId)

  // Find selected card across all sections
  const selectedCard = selectedCardId
    ? sections.flatMap(s => s.cards).find(c => c.id === selectedCardId) ?? null
    : null

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
        mode={effectiveMode}
        isDirty={isDirty}
        onSave={save}
        onReset={() => setShowResetModal(true)}
        dispatch={dispatch}
        isOwner={isOwner}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
        username={username}
      />

      {showResetModal && (
        <ResetConfirmModal
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetModal(false)}
        />
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto px-6 py-6 relative">
        <BioSection bio={bio} mode={effectiveMode} dispatch={dispatch} />

        <BentoCanvas
          state={{ ...state, mode: effectiveMode }}
          dispatch={dispatch}
          selectedCardId={selectedCardId}
          onCardSelect={handleSelect}
        />
      </div>

      {isOwner && (
        <FloatingTray
          selectedCard={effectiveMode === 'edit' ? selectedCard : null}
          onRemove={handleRemove}
          dispatch={dispatch}
        />
      )}
    </div>
  )
}
