import { useReducer } from 'react'
import { reducer, initialState, REMOVE_CARD, RESIZE_CARD } from './store/cardStore.js'
import { useCardSelection } from './hooks/useCardSelection.js'
import { usePersistence } from './hooks/usePersistence.js'
import TopBar from './components/TopBar.jsx'
import BentoCanvas from './components/BentoCanvas.jsx'
import FloatingTray from './components/FloatingTray.jsx'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { mode, cards, selectedCardId, isDirty } = state

  const { handleSelect } = useCardSelection(dispatch, mode)
  const { save, exportHTML } = usePersistence(state, dispatch)

  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null

  function handleResize(id, bento) {
    dispatch({ type: RESIZE_CARD, payload: { id, bento } })
  }

  function handleRemove(id) {
    dispatch({ type: REMOVE_CARD, payload: id })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-zinc-800 overflow-hidden">
      <TopBar
        mode={mode}
        isDirty={isDirty}
        onSave={save}
        onExport={exportHTML}
        dispatch={dispatch}
      />

      <BentoCanvas
        state={state}
        dispatch={dispatch}
        selectedCardId={selectedCardId}
        onCardSelect={handleSelect}
      />

      <FloatingTray
        selectedCard={mode === 'edit' ? selectedCard : null}
        onResize={handleResize}
        onRemove={handleRemove}
        dispatch={dispatch}
      />
    </div>
  )
}
