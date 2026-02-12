import { useCallback, useRef } from 'react'
import { useBentoGrid } from '../hooks/useBentoGrid.js'
import { ADD_CARD, REMOVE_CARD } from '../store/cardStore.js'
import BentoCard from './BentoCard.jsx'

export default function BentoCanvas({ state, dispatch, selectedCardId, onCardSelect }) {
  const { cards, mode, gridConfig } = state
  const containerRef = useRef(null)

  const handleAdd = useCallback(() => {
    dispatch({ type: ADD_CARD })
  }, [dispatch])

  const { effectiveCols } = useBentoGrid(containerRef, cards, gridConfig, mode, handleAdd)

  function handleRemove(id) {
    dispatch({ type: REMOVE_CARD, payload: id })
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {cards.length === 0 && mode === 'preview' ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-300 text-sm gap-2">
          <span className="text-4xl">⬜</span>
          <p>No cards yet. Switch to Edit mode to get started.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="bentogrid w-full max-w-4xl mx-auto"
          data-mode={mode}
        >
          {cards.map(card => (
            <BentoCard
              key={card.id}
              card={card}
              maxColumns={effectiveCols}
              isSelected={selectedCardId === card.id}
              isEditMode={mode === 'edit'}
              onSelect={onCardSelect}
              onRemove={handleRemove}
              dispatch={dispatch}
            />
          ))}
        </div>
      )}
    </div>
  )
}
