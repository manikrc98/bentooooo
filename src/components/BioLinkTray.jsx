import { useState, useEffect, useRef } from 'react'
import { Link, X } from 'lucide-react'

export default function BioLinkTray({ position, selectedText, existingUrl, onApplyLink, onRemoveLink, onClose }) {
  const [url, setUrl] = useState(existingUrl || '')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleApply() {
    if (url.trim()) {
      onApplyLink(url.trim())
    }
  }

  function handleRemove() {
    onRemoveLink()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleApply()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!position || !selectedText) return null

  const { x, y } = position

  return (
    <div
      className="bio-link-tray fixed z-50 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-xl shadow-lg px-3 py-2.5 flex flex-col gap-2"
      style={{
        left: `${x}px`,
        top: `${Math.max(10, y - 50)}px`,
        maxWidth: '350px',
      }}
    >
      {/* Selected text indicator */}
      <div className="flex items-center gap-2 text-xs">
        <Link size={12} className="text-zinc-400 shrink-0" />
        <span className="text-zinc-500">Link:</span>
        <span className="font-medium text-zinc-700 truncate max-w-[200px]" title={selectedText}>
          "{selectedText}"
        </span>
      </div>

      {/* URL input and buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="url"
          className="flex-1 text-xs bg-transparent outline-none text-zinc-700 placeholder:text-zinc-300 border border-zinc-200 rounded-lg px-2 py-1"
          placeholder="https://…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Apply button */}
        <button
          onClick={handleApply}
          className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 active:scale-95 transition-all whitespace-nowrap"
          title="Apply link"
        >
          Add
        </button>

        {/* Remove button (only show if there's an existing URL) */}
        {existingUrl && (
          <button
            onClick={handleRemove}
            className="p-1 rounded-lg text-red-400 hover:bg-red-50 active:scale-95 transition-all"
            title="Remove link"
          >
            <X size={14} />
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 active:scale-95 transition-all"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
