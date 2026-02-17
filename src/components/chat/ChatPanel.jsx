import { useState } from 'react'
import { MessageCircle, Trash2, ChevronDown, Key } from 'lucide-react'
import MessageList from './MessageList.jsx'
import ChatInput from './ChatInput.jsx'
import APIKeyManagementModal from './APIKeyManagementModal.jsx'
import { getProviderList } from '../../lib/llm/provider.js'

// Model options per provider
const MODEL_OPTIONS = {
  github: ['gpt-4o-mini', 'meta-llama-3.1-8b', 'meta-llama-3.1-70b', 'mistral-large', 'phi-3.5-mini'],
}

export default function ChatPanel({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearHistory,
  activeProvider,
  onSetProvider,
  configuredProviders,
  userId,
  onKeysUpdated,
}) {
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState(null)
  const providers = getProviderList()
  const hasProvider = !!activeProvider
  const availableModels = activeProvider ? MODEL_OPTIONS[activeProvider] || [] : []
  const selectClass = "appearance-none text-xs bg-zinc-100 border border-zinc-200 rounded-lg pl-2 pr-6 py-1 text-zinc-600 cursor-pointer outline-none hover:bg-zinc-200 transition-colors"

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-blue-500" />
          <span className="text-sm font-semibold text-zinc-800">Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {/* API Key Management */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title="Manage API keys"
          >
            <Key size={14} />
          </button>

          {/* Provider selector */}
          <div className="relative">
            <select
              value={activeProvider || ''}
              onChange={e => {
                onSetProvider(e.target.value || null)
                setSelectedModel(null) // Reset model when provider changes
              }}
              className={selectClass}
            >
              <option value="">No provider</option>
              {providers.map(p => (
                <option key={p.id} value={p.id} disabled={!configuredProviders.includes(p.id)}>
                  {p.label} {configuredProviders.includes(p.id) ? '' : '(no key)'}
                </option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          {/* Model selector */}
          {activeProvider && availableModels.length > 0 && (
            <div className="relative">
              <select
                value={selectedModel || ''}
                onChange={e => setSelectedModel(e.target.value || null)}
                className={selectClass}
              >
                <option value="">Default model</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          )}

          {/* Clear history */}
          {messages.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
          {error}
        </div>
      )}

      {/* No provider message */}
      {!hasProvider && messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <MessageCircle size={24} className="text-blue-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700 mb-1">Set up your AI provider</p>
          <p className="text-xs text-zinc-400 max-w-[280px] mb-3">
            To start chatting, you need to connect an LLM provider. Type a message like:
          </p>
          <div className="space-y-1.5 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-xl px-4 py-3">
            <p>"Set my GitHub key: ghp_..."</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {(hasProvider || messages.length > 0) && (
        <MessageList messages={messages} isLoading={isLoading} />
      )}

      {/* Input */}
      <ChatInput
        onSend={(text) => onSendMessage(text, selectedModel)}
        disabled={isLoading}
      />

      {/* API Key Management Modal */}
      {showKeyModal && userId && (
        <APIKeyManagementModal
          userId={userId}
          onClose={() => setShowKeyModal(false)}
          onKeysUpdated={onKeysUpdated}
        />
      )}
    </div>
  )
}
