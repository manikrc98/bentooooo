import { useState, useRef, useEffect } from 'react'
import { SendHorizonal } from 'lucide-react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="shrink-0 border-t border-zinc-200 px-4 py-3">
      <div className="flex items-end gap-2 bg-zinc-50 rounded-xl border border-zinc-200 px-3 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your portfolio..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 resize-none outline-none max-h-[120px]"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${
            text.trim() && !disabled
              ? 'text-blue-500 hover:bg-blue-50'
              : 'text-zinc-300 cursor-not-allowed'
          }`}
        >
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  )
}
