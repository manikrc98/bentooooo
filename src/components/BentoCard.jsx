import { useState, useCallback, useRef, useEffect } from 'react'
import { GripVertical } from 'lucide-react'
import { UPDATE_CARD_CONTENT, RESIZE_CARD } from '../store/cardStore.js'
import { clampBento, parseBento, formatBento } from '../utils/bentoDimensions.js'

const MAX_RESIZE_ROWS = 4

function ResizeGrid({ currentBento, maxColumns, onResize }) {
  const { cols: currentCols, rows: currentRows } = parseBento(currentBento)
  const [hoverSize, setHoverSize] = useState(null)

  const displayCols = hoverSize ? hoverSize.col : currentCols
  const displayRows = hoverSize ? hoverSize.row : currentRows
  const label = `${displayCols}\u00D7${displayRows}`

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 rounded-2xl
        outline-2 outline-dashed outline-zinc-300 -outline-offset-2"
      style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${maxColumns}, 1fr)`, width: '60%', maxWidth: 140 }}
        onMouseLeave={() => setHoverSize(null)}
      >
        {Array.from({ length: MAX_RESIZE_ROWS }, (_, r) =>
          Array.from({ length: maxColumns }, (_, c) => {
            const row = r + 1
            const col = c + 1
            const isHighlighted = col <= displayCols && row <= displayRows
            return (
              <div
                key={`${row}-${col}`}
                className="aspect-square rounded-sm cursor-pointer transition-colors duration-100"
                style={{ background: isHighlighted ? '#60a5fa' : 'rgba(0,0,0,0.1)' }}
                onMouseEnter={() => setHoverSize({ col, row })}
                onClick={e => {
                  e.stopPropagation()
                  onResize(formatBento(col, row))
                }}
              />
            )
          })
        )}
      </div>
      <span className="text-black/50 text-xs font-medium mt-1.5 select-none">{label}</span>
    </div>
  )
}

/* ── Auto-scaling text component (preview mode) ─────────────────── */
function AutoScaleText({ text, cardRef, textColor }) {
  const measureRef = useRef(null)
  const [fontSize, setFontSize] = useState(120)

  const recalc = useCallback(() => {
    if (!cardRef.current || !measureRef.current || !text) return
    const card = cardRef.current
    const pad = 24
    const maxW = card.offsetWidth - pad * 2
    const maxH = card.offsetHeight - pad * 2
    if (maxW <= 0 || maxH <= 0) return

    const el = measureRef.current
    const words = text.split(/\s+/)
    const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '')

    let lo = 12, hi = 120, best = 12
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      el.style.fontSize = `${mid}px`

      // Ensure longest word fits on one line
      el.style.whiteSpace = 'nowrap'
      el.style.width = 'auto'
      el.style.maxWidth = 'none'
      el.textContent = longestWord
      const wordFits = el.scrollWidth <= maxW

      // Ensure full text with wrapping fits in height
      el.style.whiteSpace = 'pre-wrap'
      el.style.width = `${maxW}px`
      el.style.maxWidth = `${maxW}px`
      el.textContent = text
      const textFits = el.scrollHeight <= maxH

      if (wordFits && textFits) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    setFontSize(best)
  }, [text, cardRef])

  useEffect(() => { recalc() }, [recalc])

  useEffect(() => {
    if (!cardRef.current) return
    const observer = new ResizeObserver(recalc)
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [recalc, cardRef])

  if (!text) return null

  return (
    <>
      <div
        ref={measureRef}
        className="offscreen-measure font-semibold leading-tight whitespace-pre-wrap"
      />
      <div
        className="absolute inset-0 flex items-center justify-center p-6 font-semibold leading-tight overflow-hidden whitespace-pre-wrap text-center"
        style={{
          fontSize: `${fontSize}px`,
          color: textColor,
          overflowWrap: 'break-word',
        }}
      >
        {text}
      </div>
    </>
  )
}

/* ── Auto-scaling editable textarea ────────────────────────────── */
function AutoScaleTextarea({ text, cardRef, textColor, onChange }) {
  const textareaRef = useRef(null)
  const measureRef = useRef(null)
  const [fontSize, setFontSize] = useState(120)

  const recalc = useCallback(() => {
    if (!cardRef.current || !measureRef.current) return
    const card = cardRef.current
    const pad = 24
    const maxW = card.offsetWidth - pad * 2
    const maxH = card.offsetHeight - pad * 2
    if (maxW <= 0 || maxH <= 0) return

    const el = measureRef.current
    const t = text || 'M'
    const words = t.split(/\s+/)
    const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '')

    let lo = 12, hi = 120, best = 12
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      el.style.fontSize = `${mid}px`

      // Ensure longest word fits on one line
      el.style.whiteSpace = 'nowrap'
      el.style.width = 'auto'
      el.style.maxWidth = 'none'
      el.textContent = longestWord
      const wordFits = el.scrollWidth <= maxW

      // Ensure full text with wrapping fits in height
      el.style.whiteSpace = 'pre-wrap'
      el.style.width = `${maxW}px`
      el.style.maxWidth = `${maxW}px`
      el.textContent = t
      const textFits = el.scrollHeight <= maxH

      if (wordFits && textFits) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    setFontSize(best)
  }, [text, cardRef])

  useEffect(() => { recalc() }, [recalc])

  useEffect(() => {
    if (!cardRef.current) return
    const observer = new ResizeObserver(recalc)
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [recalc, cardRef])

  // Auto-adjust textarea height whenever fontSize or text changes (not just on user input)
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [fontSize, text])

  return (
    <>
      <div
        ref={measureRef}
        className="offscreen-measure font-semibold leading-tight whitespace-pre-wrap"
      />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent resize-none outline-none border-0 font-semibold leading-tight text-center"
          style={{
            color: textColor,
            fontSize: `${fontSize}px`,
            overflowWrap: 'break-word',
            maxHeight: '100%',
            overflow: 'hidden',
          }}
          rows={1}
          placeholder="Type something…"
          value={text}
          onChange={e => {
            onChange(e.target.value)
          }}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </>
  )
}

export default function BentoCard({
  card, maxColumns, isSelected, isEditMode, onSelect, dispatch,
  index, onDragStart, isDragging, isDropTarget,
}) {
  const { id, bento, content } = card
  const { type = 'image', imageUrl, videoUrl, text, title, bgColor, textColor, linkUrl } = content
  const [isHovered, setIsHovered] = useState(false)
  const [shiftHeld, setShiftHeld] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    if (!isEditMode) return
    const down = (e) => { if (e.key === 'Shift') setShiftHeld(true) }
    const up = (e) => { if (e.key === 'Shift') setShiftHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [isEditMode, type])

  const handleResize = useCallback((newBento) => {
    dispatch({ type: RESIZE_CARD, payload: { id, bento: newBento } })
  }, [dispatch, id])

  function handleTitleChange(e) {
    dispatch({ type: UPDATE_CARD_CONTENT, payload: { id, updates: { title: e.target.value } } })
  }

  const hasMedia = type === 'image' ? imageUrl : type === 'video' ? videoUrl : false

  const Tag = (!isEditMode && linkUrl) ? 'a' : 'div'
  const linkProps = (!isEditMode && linkUrl)
    ? { href: linkUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Tag
      ref={cardRef}
      data-bento={clampBento(bento, maxColumns)}
      data-card-id={id}
      {...linkProps}
      className={`bento-card block relative rounded-2xl overflow-hidden cursor-pointer select-none
        ${isSelected ? 'selected' : ''}
        group
      `}
      style={{
        backgroundColor: bgColor,
        backgroundImage: (type === 'image' && imageUrl) ? `url(${imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={() => isEditMode && onSelect(id)}
      onMouseEnter={() => isEditMode && setIsHovered(true)}
      onMouseLeave={() => isEditMode && setIsHovered(false)}
    >
      {/* Video background */}
      {type === 'video' && videoUrl && (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Auto-scaling text */}
      {type === 'text' && (
        <>
          {isEditMode ? (
            <AutoScaleTextarea
              text={text || ''}
              cardRef={cardRef}
              textColor={textColor}
              onChange={val => {
                dispatch({ type: UPDATE_CARD_CONTENT, payload: { id, updates: { text: val } } })
              }}
            />
          ) : (
            <AutoScaleText text={text} cardRef={cardRef} textColor={textColor} />
          )}
        </>
      )}

      {/* Drop zone indicator when this card is the target */}
      {isDropTarget && !isDragging && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none
            bg-gray-300
            ring-2 ring-gray-400"
          style={{ zIndex: 10 }}
        />
      )}

      {/* Floating caption — hidden for text cards */}
      {type !== 'text' && (
        <div className={`absolute bottom-0 left-0 right-0 p-3 ${isEditMode ? 'z-30' : ''}`}>
          {isEditMode ? (
            <input
              className="bg-transparent font-medium text-sm outline-none border-0 w-full placeholder:opacity-30"
              style={{ color: hasMedia ? '#ffffff' : textColor }}
              placeholder="Caption…"
              value={title}
              onChange={handleTitleChange}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            title && (
              <span
                className="inline-block text-sm font-medium px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/90 shadow-sm"
                style={{ color: textColor }}
              >
                {title}
              </span>
            )
          )}
        </div>
      )}

      {/* Edit mode overlay: selection ring, drag handle, resize grid */}
      {isEditMode && (
        <div className={`absolute inset-0 rounded-2xl transition-all duration-150
          ${isSelected ? 'ring-[2.5px] ring-blue-400' : 'ring-0 hover:ring-[1.5px] hover:ring-blue-300/50'}
          ${type === 'text' && !shiftHeld ? 'pointer-events-none' : ''}
        `}>
          {/* Drag handle – always visible on hover, above resize grid */}
          <div
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDragStart(index, e)
            }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
              rounded-lg bg-black/15 backdrop-blur-sm text-black/50
              hover:bg-black/25 hover:text-black/80 transition-all cursor-grab active:cursor-grabbing z-30
              opacity-0 group-hover:opacity-100 pointer-events-auto"
            style={{ color: hasMedia ? 'rgba(255,255,255,0.7)' : undefined }}
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </div>

          {/* Resize grid overlay on hover — for text cards only when Shift is held */}
          {isHovered && shiftHeld && (
            <ResizeGrid
              currentBento={clampBento(bento, maxColumns)}
              maxColumns={maxColumns}
              onResize={handleResize}
            />
          )}

        </div>
      )}

      {/* Hint for text cards: hold shift to resize — outside overlay so it doesn't interfere */}
      {isEditMode && isHovered && !shiftHeld && (
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-black/30 select-none pointer-events-none z-30">
          Hold Shift to resize
        </span>
      )}
    </Tag>
  )
}
