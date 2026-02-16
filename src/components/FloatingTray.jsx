import { useRef } from 'react'
import { Trash2, ImagePlus, Link } from 'lucide-react'
import { UPDATE_CARD_CONTENT } from '../store/cardStore.js'

export default function FloatingTray({ selectedCard, onRemove, dispatch }) {
  const isVisible = selectedCard !== null
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

    </div>
  )
}
