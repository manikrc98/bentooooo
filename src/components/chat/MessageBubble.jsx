import { Bot, User } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer.jsx'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // Skip tool messages (they're internal)
  if (!isUser && !isAssistant) return null
  // Skip assistant messages that are only tool calls with no text
  if (isAssistant && !message.content && message.toolCalls?.length) return null

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-600'
      }`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-blue-500 text-white rounded-tr-md'
          : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-md'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  )
}
