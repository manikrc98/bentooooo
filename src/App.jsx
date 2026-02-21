import { useReducer, useState, useEffect, useCallback } from 'react'
import { reducer, initialState, REMOVE_CARD, RESET_STATE } from './store/cardStore.js'
import { useCardSelection } from './hooks/useCardSelection.js'
import { usePersistence } from './hooks/usePersistence.js'
import { useUndoRedo } from './hooks/useUndoRedo.js'
import { useChat } from './hooks/useChat.js'
import { useAuth } from './contexts/AuthContext.jsx'
import TopBar from './components/TopBar.jsx'
import BentoCanvas from './components/BentoCanvas.jsx'
import FloatingTray from './components/FloatingTray.jsx'
import BioSection from './components/BioSection.jsx'
import ResetConfirmModal from './components/ResetConfirmModal.jsx'
import ChatPanel from './components/chat/ChatPanel.jsx'
import PortfolioPreview from './components/chat/PortfolioPreview.jsx'

function Toast({ message, visible }) {
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl
        bg-zinc-800 text-white text-sm font-medium shadow-lg
        transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
    >
      {message}
    </div>
  )
}

export default function App({ profileData, isOwner, username, profileUserId }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { mode, sections, selectedCardId, isDirty, bio } = state
  const [showResetModal, setShowResetModal] = useState(false)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [adjustingCardId, setAdjustingCardId] = useState(null)

  const { user, signInWithGoogle, signOut, authError, clearAuthError } = useAuth()

  // Non-owners always see preview mode
  const effectiveMode = isOwner ? mode : 'preview'

  const { trackedDispatch, undo, redo } = useUndoRedo(state, dispatch)

  const showToast = useCallback((message) => {
    setToast({ message, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 1500)
  }, [])

  // Keyboard listeners for undo/redo
  useEffect(() => {
    if (effectiveMode !== 'edit' && effectiveMode !== 'chat') return

    function handleKeyDown(e) {
      const isMeta = e.metaKey || e.ctrlKey
      if (!isMeta || e.key !== 'z') return

      e.preventDefault()
      if (e.shiftKey) {
        const didRedo = redo()
        showToast(didRedo ? 'Redo successful' : 'Nothing to redo')
      } else {
        const didUndo = undo()
        showToast(didUndo ? 'Undo successful' : 'Nothing to undo')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [effectiveMode, undo, redo, showToast])

  const { handleSelect } = useCardSelection(trackedDispatch, effectiveMode)
  const { save, saving, saveError, clearSaveError } = usePersistence(state, trackedDispatch, profileData, profileUserId)
  const chat = useChat(state, trackedDispatch, profileUserId)

  // Find selected card across all sections
  const selectedCard = selectedCardId
    ? sections.flatMap(s => s.cards).find(c => c.id === selectedCardId) ?? null
    : null

  function handleRemove(id) {
    trackedDispatch({ type: REMOVE_CARD, payload: id })
  }

  function handleResetConfirm() {
    trackedDispatch({ type: RESET_STATE })
    setShowResetModal(false)
  }

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-zinc-800 overflow-hidden">
      <Toast message={toast.message} visible={toast.visible} />

      <TopBar
        mode={effectiveMode}
        isDirty={isDirty}
        onSave={save}
        saving={saving}
        saveError={saveError}
        onClearSaveError={clearSaveError}
        onReset={() => setShowResetModal(true)}
        dispatch={trackedDispatch}
        isOwner={isOwner}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
        username={username}
        authError={authError}
        onClearAuthError={clearAuthError}
      />

      {showResetModal && (
        <ResetConfirmModal
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetModal(false)}
        />
      )}

      {effectiveMode === 'chat' ? (
        <div className="flex-1 flex min-h-0">
          <div className="w-[45%] min-w-[320px] border-r border-zinc-200">
            <ChatPanel
              messages={chat.messages}
              isLoading={chat.isLoading}
              error={chat.error}
              onSendMessage={chat.sendMessage}
              onClearHistory={chat.clearHistory}
              activeProvider={chat.activeProvider}
              onSetProvider={chat.setProvider}
              configuredProviders={chat.configuredProviders}
              userId={profileUserId}
              onKeysUpdated={chat.loadKeys}
            />
          </div>
          <div className="flex-1 min-h-0">
            <PortfolioPreview state={state} dispatch={trackedDispatch} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto px-6 py-6 relative">
            <BioSection bio={bio} mode={effectiveMode} dispatch={trackedDispatch} />

            <BentoCanvas
              state={{ ...state, mode: effectiveMode }}
              dispatch={trackedDispatch}
              selectedCardId={selectedCardId}
              onCardSelect={handleSelect}
              adjustingCardId={adjustingCardId}
              onAdjustCancel={() => setAdjustingCardId(null)}
            />
          </div>

          {isOwner && (
            <FloatingTray
              selectedCard={effectiveMode === 'edit' ? selectedCard : null}
              onRemove={handleRemove}
              dispatch={trackedDispatch}
              onStartAdjust={() => selectedCardId && setAdjustingCardId(selectedCardId)}
              isAdjusting={adjustingCardId !== null && adjustingCardId === selectedCardId}
            />
          )}
        </>
      )}
    </div>
  )
}
