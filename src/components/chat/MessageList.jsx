import { useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { Loader2 } from 'lucide-react'

export default function MessageList({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm">
          <p className="font-medium mb-1">Portfolio Assistant</p>
          <p className="text-xs text-center max-w-[240px]">
            Ask me to create sections, add cards, update your bio, or help build your portfolio.
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}

      {isLoading && (
        <div className="flex gap-2 items-center">
          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center">
            <Loader2 size={14} className="animate-spin text-zinc-500" />
          </div>
          <div className="px-3 py-2 rounded-2xl rounded-tl-md bg-white border border-zinc-200 text-zinc-400 text-sm">
            Thinking...
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
