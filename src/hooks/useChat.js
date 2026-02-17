import { useState, useEffect, useCallback, useRef } from 'react'
import { getKeys, setKey as storeSetKey, removeKey as storeRemoveKey, getConfiguredProviders } from '../lib/llmKeyStore.js'
import { createProvider } from '../lib/llm/provider.js'
import { LLMError } from '../lib/llm/types.js'
import { sendMessage as orchestrate } from '../lib/chat/orchestrator.js'
import { initializeSmartChat } from '../lib/llm/smartChatWrapper.js'

/**
 * Key management commands that can be handled without an active LLM provider.
 * Returns a response string if handled, null otherwise.
 */
async function tryHandleKeyCommand(text, userId, reloadKeys) {
  const lower = text.toLowerCase()

  // "set my github key: ghp_..."
  const setMatch = text.match(/(?:set|use|connect|add)\s+(?:my\s+)?(\w+)\s+key[:\s]+(\S+)/i)
  if (setMatch) {
    const providerName = setMatch[1].toLowerCase()
    const apiKey = setMatch[2]
    const providerMap = { github: 'github' }
    const providerId = providerMap[providerName]
    if (!providerId) return `I don't recognize "${providerName}" as a provider. Supported: GitHub.`

    try {
      const provider = createProvider(providerId, apiKey)
      const valid = await provider.validateKey()
      if (!valid) return `The ${providerName} API key appears to be invalid. Please double-check it and try again.`
      await storeSetKey(userId, providerId, apiKey)
      await reloadKeys()

      let message = `Your ${providerName} API key has been saved and validated. You're all set to start chatting!`

      // Add helpful warnings for free tier providers
      if (providerId === 'gemini') {
        message += '\n\n⚠️ Note: Gemini free tier is limited to 5 requests per minute. The system is configured to respect this limit with automatic rate limiting and reduced tool iterations.'
      }

      return message
    } catch (err) {
      return `Failed to set the key: ${err.message}`
    }
  }

  // "remove my github key"
  const removeMatch = lower.match(/(?:remove|delete|clear)\s+(?:my\s+)?(\w+)\s+key/)
  if (removeMatch) {
    const providerName = removeMatch[1]
    const providerMap = { github: 'github' }
    const providerId = providerMap[providerName]
    if (!providerId) return `I don't recognize "${providerName}" as a provider.`
    try {
      await storeRemoveKey(userId, providerId)
      await reloadKeys()
      return `Removed your ${providerName} API key.`
    } catch (err) {
      return `Failed to remove the key: ${err.message}`
    }
  }

  // "which model am I using?" / "what provider?"
  if (lower.match(/which\s+(model|provider|key)/i) || lower.match(/what\s+(model|provider|key)/i)) {
    try {
      const configured = await getConfiguredProviders(userId)
      if (configured.length === 0) return 'You have no LLM providers configured. Set one up by typing: "Set my GitHub key: ghp_..."'
      return `You have keys configured for: ${configured.join(', ')}.`
    } catch {
      return null
    }
  }

  // "clear chat history" / "start new chat" / "clear conversation"
  if (lower.match(/(?:clear|reset|start\s+new)\s+(?:chat|conversation|history)/i) || lower.match(/^(?:clear|reset)$/)) {
    return 'CLEAR_CHAT'
  }

  return null
}

/**
 * Custom hook for chat functionality.
 */
export function useChat(state, dispatch, userId) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeProvider, setActiveProvider] = useState(null)
  const [configuredProviders, setConfiguredProviders] = useState([])
  const [keys, setKeys] = useState({})

  // Use ref for state so orchestrator always sees latest
  const stateRef = useRef(state)
  stateRef.current = state

  // Load keys on mount
  const loadKeys = useCallback(async () => {
    if (!userId) return
    try {
      const fetchedKeys = await getKeys(userId)
      setKeys(fetchedKeys)
      const providers = Object.keys(fetchedKeys)
      setConfiguredProviders(providers)
      // Auto-select first available provider if none selected
      if (!activeProvider && providers.length > 0) {
        setActiveProvider(providers[0])
      }
    } catch {
      // Keys might not exist yet — that's fine
    }
  }, [userId, activeProvider])

  useEffect(() => {
    // Initialize smart chat system (token tracking, quota management)
    initializeSmartChat()
    loadKeys()
  }, [loadKeys])

  const sendMessage = useCallback(async (text, model = null) => {
    if (!text.trim()) return
    setError(null)

    // First, try handling key management commands locally
    const keyResponse = await tryHandleKeyCommand(text, userId, loadKeys)
    if (keyResponse) {
      // Handle clear chat command
      if (keyResponse === 'CLEAR_CHAT') {
        setMessages([])
        return
      }
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: keyResponse },
      ])
      return
    }

    // If no active provider, guide the user
    if (!activeProvider || !keys[activeProvider]) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: 'I need an LLM provider to help you. Please set one up first:\n\n- "Set my GitHub key: ghp_..."' },
      ])
      return
    }

    setIsLoading(true)
    // Add user message immediately for UI feedback
    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const provider = createProvider(activeProvider, keys[activeProvider])

      const result = await orchestrate(text, messages, {
        state: stateRef.current,
        dispatch,
        provider,
        userId,
        model,
      })

      setMessages(result.updatedHistory)
    } catch (err) {
      if (err instanceof LLMError) {
        if (err.isAuthError) {
          setError(`API key error for ${err.provider}. Please update your key.`)
        } else if (err.isRateLimit) {
          setError('Rate limited. Please wait a moment and try again.')
        } else {
          setError(err.message)
        }
      } else {
        setError(err.message || 'An unexpected error occurred.')
      }
      // Add error as assistant message
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [activeProvider, keys, messages, dispatch, userId, loadKeys])

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const setProvider = useCallback((providerId) => {
    setActiveProvider(providerId || null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    activeProvider,
    setProvider,
    configuredProviders,
    loadKeys,
  }
}
