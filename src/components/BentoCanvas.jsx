import { useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { useBentoGrid } from '../hooks/useBentoGrid.js'
import { ADD_CARD, REMOVE_CARD, REORDER_CARDS } from '../store/cardStore.js'
import BentoCard from './BentoCard.jsx'

export default function BentoCanvas({ state, dispatch, selectedCardId, onCardSelect }) {
  const { cards, mode, gridConfig } = state
  const containerRef = useRef(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dropTargetIndex, setDropTargetIndex] = useState(null)
  const prevCardCountRef = useRef(cards.length)

  // Mutable refs for pointer-event handlers (avoids stale closures)
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const dragIndexRef = useRef(null)
  const dropTargetIndexRef = useRef(null)

  // FLIP animation refs
  const flipRectsRef = useRef(new Map())
  const draggedIdRef = useRef(null)

  const handleAdd = useCallback(() => {
    const newId = `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    dispatch({ type: ADD_CARD, payload: { id: newId } })
  }, [dispatch])

  const { effectiveCols } = useBentoGrid(containerRef, cards, gridConfig, mode, handleAdd)

  function handleRemove(id) {
    dispatch({ type: REMOVE_CARD, payload: id })
  }

  // Capture bounding rects of all cards for FLIP
  function captureCardRects() {
    const rects = new Map()
    containerRef.current?.querySelectorAll('[data-card-id]').forEach(el => {
      rects.set(el.dataset.cardId, el.getBoundingClientRect())
    })
    return rects
  }

  // FLIP animation: runs after BentoGrid recalculates in its useLayoutEffect
  useLayoutEffect(() => {
    const oldRects = flipRectsRef.current
    if (oldRects.size === 0) return
    flipRectsRef.current = new Map()

    // Clear any existing FLIP transforms first so getBoundingClientRect is clean
    containerRef.current?.querySelectorAll('[data-card-id]').forEach(el => {
      el.style.transform = ''
      el.style.transition = ''
    })

    containerRef.current?.querySelectorAll('[data-card-id]').forEach(el => {
      const id = el.dataset.cardId
      const oldRect = oldRects.get(id)
      if (!oldRect) return

      // Skip the dragged card — it has a ghost following the cursor
      if (id === draggedIdRef.current) return

      const newRect = el.getBoundingClientRect()
      const dx = oldRect.left - newRect.left
      const dy = oldRect.top - newRect.top

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      // Invert: place at old position
      el.style.transform = `translate(${dx}px, ${dy}px)`
      el.style.transition = 'none'

      // Play: animate to new position
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.2s ease'
        el.style.transform = ''
      })
    })
  }, [cards])

  // Pointer-event based drag start
  const handleDragStart = useCallback((index, e) => {
    const container = containerRef.current
    if (!container) return

    const cardEl = container.querySelectorAll('[data-card-id]')[index]
    if (!cardEl) return

    const rect = cardEl.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    // Create ghost clone that follows cursor
    const ghost = cardEl.cloneNode(true)
    ghost.style.cssText = `
      position: fixed;
      width: ${rect.width}px;
      height: ${rect.height}px;
      left: ${rect.left}px;
      top: ${rect.top}px;
      z-index: 9999;
      pointer-events: none;
      opacity: 1;
      transform: scale(1.03);
      box-shadow: 0 16px 32px rgba(0,0,0,0.15);
      border-radius: 16px;
      overflow: hidden;
      transition: box-shadow 0.15s ease;
    `
    document.body.appendChild(ghost)

    const draggedId = cardsRef.current[index].id
    draggedIdRef.current = draggedId
    dragIndexRef.current = index
    setDragIndex(index)

    // Track which card ID the cursor is currently over for the drop
    let currentDropTargetId = null

    function onPointerMove(ev) {
      // Move ghost to cursor
      ghost.style.left = (ev.clientX - offsetX) + 'px'
      ghost.style.top = (ev.clientY - offsetY) + 'px'

      // Detect card under cursor (hide ghost temporarily for elementFromPoint)
      ghost.style.display = 'none'
      const target = document.elementFromPoint(ev.clientX, ev.clientY)
      ghost.style.display = ''

      const targetCard = target?.closest?.('[data-card-id]')

      // Clear drop target if not hovering over a card
      if (!targetCard) {
        setDropTargetIndex(null)
        dropTargetIndexRef.current = null
        currentDropTargetId = null
        return
      }

      const targetId = targetCard.dataset.cardId
      const currentCards = cardsRef.current
      const overIndex = currentCards.findIndex(c => c.id === targetId)

      // Show drop target indicator (visual only, no reorder yet)
      if (overIndex !== -1 && overIndex !== dragIndexRef.current) {
        setDropTargetIndex(overIndex)
        dropTargetIndexRef.current = overIndex
        currentDropTargetId = targetId
      } else {
        setDropTargetIndex(null)
        dropTargetIndexRef.current = null
        currentDropTargetId = null
      }
    }

    function onPointerUp() {
      // Perform the reorder only on drop
      if (currentDropTargetId) {
        const currentCards = cardsRef.current
        const fromIndex = dragIndexRef.current
        const toIndex = currentCards.findIndex(c => c.id === currentDropTargetId)

        if (toIndex !== -1 && toIndex !== fromIndex) {
          flipRectsRef.current = captureCardRects()
          dispatch({ type: REORDER_CARDS, payload: { fromIndex, toIndex } })
        }
      }

      ghost.remove()
      draggedIdRef.current = null
      dragIndexRef.current = null
      dropTargetIndexRef.current = null
      setDragIndex(null)
      setDropTargetIndex(null)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }, [dispatch])

  // Auto-scroll to newly created cards
  useEffect(() => {
    const wasAdded = cards.length > prevCardCountRef.current
    prevCardCountRef.current = cards.length

    if (!wasAdded || !selectedCardId) return

    requestAnimationFrame(() => {
      const cardEl = containerRef.current?.querySelector(`[data-card-id="${selectedCardId}"]`)
      cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [cards.length, selectedCardId])

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
          {cards.map((card, index) => (
            <BentoCard
              key={card.id}
              card={card}
              index={index}
              maxColumns={effectiveCols}
              isSelected={selectedCardId === card.id}
              isEditMode={mode === 'edit'}
              onSelect={onCardSelect}
              onRemove={handleRemove}
              dispatch={dispatch}
              onDragStart={handleDragStart}
              isDragging={dragIndex === index}
              isDropTarget={dropTargetIndex === index && dragIndex !== null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
