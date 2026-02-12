import { useRef } from 'react'
import { Trash2, ImagePlus, Link } from 'lucide-react'
import { formatBento } from '../utils/bentoDimensions.js'
import { UPDATE_CARD_CONTENT } from '../store/cardStore.js'

const PRESETS = [
  { label: '1×1', cols: 1, rows: 1 },
  { label: '1×2', cols: 1, rows: 2 },
  { label: '2×1', cols: 2, rows: 1 },
  { label: '2×2', cols: 2, rows: 2 },
  { label: '3×1', cols: 3, rows: 1 },
  { label: '3×2', cols: 3, rows: 2 },
  { label: '2×3', cols: 2, rows: 3 },
  { label: '4×1', cols: 4, rows: 1 },
  { label: '4×2', cols: 4, rows: 2 },
]

function PresetButton({ preset, isActive, onClick }) {
  const { label, cols, rows } = preset
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl
        transition-all duration-150 select-none
        ${isActive
          ? 'bg-blue-50 ring-1 ring-blue-400/60'
          : 'hover:bg-zinc-100 active:scale-95'}
      `}
      title={label}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 7px)`,
          gridTemplateRows: `repeat(${rows}, 7px)`,
          gap: '1.5px',
        }}
      >
        {Array(cols * rows).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              backgroundColor: isActive ? '#3b82f6' : 'rgba(100,116,139,0.5)',
            }}
          />
        ))}
      </div>
      <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-blue-500' : 'text-zinc-400'}`}>
        {label}
      </span>
    </button>
  )
}

export default function FloatingTray({ selectedCard, onResize, onRemove, dispatch }) {
  const isVisible = selectedCard !== null
  const currentBento = selectedCard?.bento ?? '1x1'
  const fileInputRef = useRef(null)

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedCard) return
    const url = URL.createObjectURL(file)
    dispatch({ type: UPDATE_CARD_CONTENT, payload: { id: selectedCard.id, updates: { imageUrl: url } } })
  }

  function handleLinkChange(e) {
    if (!selectedCard) return
    dispatch({ type: UPDATE_CARD_CONTENT, payload: { id: selectedCard.id, updates: { linkUrl: e.target.value } } })
  }

  return (
    <div
      className={`floating-tray fixed bottom-5 left-1/2 z-50
        flex items-center gap-2
        bg-white/95 backdrop-blur-md
        border border-zinc-200
        rounded-2xl shadow-xl shadow-zinc-300/50
        px-3 py-2
        ${isVisible ? 'visible' : 'hidden'}
      `}
    >
      {/* Remove button */}
      <button
        onClick={() => selectedCard && onRemove(selectedCard.id)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-red-400 hover:bg-red-50 active:scale-95 transition-all"
        title="Remove card"
      >
        <Trash2 size={16} />
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-zinc-200 mx-1" />

      {/* Image upload */}
      <button
        className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:scale-95 transition-all"
        title="Upload image"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={16} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Hyperlink input */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
        <Link size={13} className="text-zinc-400 shrink-0" />
        <input
          type="url"
          className="text-xs text-zinc-600 bg-transparent outline-none w-32 placeholder:text-zinc-300"
          placeholder="https://…"
          value={selectedCard?.content?.linkUrl ?? ''}
          onChange={handleLinkChange}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-zinc-200 mx-1" />

      {/* Size presets */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {PRESETS.map((preset) => {
          const bentoStr = formatBento(preset.cols, preset.rows)
          return (
            <PresetButton
              key={bentoStr}
              preset={preset}
              isActive={currentBento === bentoStr}
              onClick={() => selectedCard && onResize(selectedCard.id, bentoStr)}
            />
          )
        })}
      </div>
    </div>
  )
}
