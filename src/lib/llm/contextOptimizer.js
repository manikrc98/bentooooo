/**
 * Context optimizer to reduce token usage while preserving important information.
 * Implements strategies like history trimming, summarization hints, and context windowing.
 */

import { estimateTokens, countConversationTokens } from './tokenCounter.js'

const DEFAULT_MAX_CONTEXT_TOKENS = 4000 // Leave room for response
const DEFAULT_MIN_MESSAGES = 2 // Keep at least user + assistant

/**
 * Trim conversation history to fit within token budget
 * Keeps most recent messages and removes oldest ones
 * @param {Array} messages - Message array with system message first
 * @param {number} maxTokens - Maximum tokens allowed
 * @param {number} minMessages - Minimum messages to keep (not counting system)
 * @returns {{ messages: Array, trimmed: boolean, tokensRemoved: number }}
 */
export function trimConversationHistory(
  messages,
  maxTokens = DEFAULT_MAX_CONTEXT_TOKENS,
  minMessages = DEFAULT_MIN_MESSAGES
) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages, trimmed: false, tokensRemoved: 0 }
  }

  const initialTokens = countConversationTokens(messages)
  if (initialTokens <= maxTokens) {
    return { messages, trimmed: false, tokensRemoved: 0 }
  }

  // Separate system message from conversation
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')

  if (conversationMessages.length <= minMessages) {
    return { messages, trimmed: false, tokensRemoved: 0 }
  }

  // Trim from the beginning, keeping system + recent messages
  let trimmed = [...systemMessages]
  let currentTokens = countConversationTokens(trimmed)

  // Binary search for the best starting point
  let startIndex = 0
  let endIndex = conversationMessages.length - minMessages

  while (startIndex < endIndex) {
    const mid = Math.floor((startIndex + endIndex) / 2)
    const candidate = [...trimmed, ...conversationMessages.slice(mid)]
    const candidateTokens = countConversationTokens(candidate)

    if (candidateTokens <= maxTokens) {
      endIndex = mid
    } else {
      startIndex = mid + 1
    }
  }

  trimmed = [...trimmed, ...conversationMessages.slice(startIndex)]
  const finalTokens = countConversationTokens(trimmed)
  const tokensRemoved = initialTokens - finalTokens

  return {
    messages: trimmed,
    trimmed: startIndex > 0,
    tokensRemoved,
  }
}

/**
 * Compress conversation by removing redundant information
 * @param {Array} messages
 * @returns {{ messages: Array, tokensRemoved: number }}
 */
export function compressConversation(messages) {
  if (!Array.isArray(messages)) {
    return { messages, tokensRemoved: 0 }
  }

  const initialTokens = countConversationTokens(messages)
  const compressed = messages.map(msg => {
    if (msg.role === 'user' && msg.content) {
      // Remove redundant whitespace
      let content = msg.content.replace(/\s+/g, ' ').trim()
      // Remove common filler phrases
      content = content.replace(/\b(please|thanks|kindly|could you|would you|can you)\b/gi, '').trim()
      return { ...msg, content }
    }
    return msg
  })

  const finalTokens = countConversationTokens(compressed)
  return { messages: compressed, tokensRemoved: initialTokens - finalTokens }
}

/**
 * Create a summarization hint for the model about earlier conversation
 * @param {Array} messages - Full conversation
 * @param {number} summaryStartIndex - Index where earlier messages start
 * @returns {string|null}
 */
export function createSummaryHint(messages, summaryStartIndex) {
  if (!Array.isArray(messages) || summaryStartIndex >= messages.length - 1) {
    return null
  }

  const earlierMessages = messages.slice(0, summaryStartIndex).filter(m => m.role !== 'system')
  if (earlierMessages.length === 0) return null

  const userTurns = earlierMessages.filter(m => m.role === 'user').length
  const assistantTurns = earlierMessages.filter(m => m.role === 'assistant').length

  return `[Earlier in conversation (${userTurns} user + ${assistantTurns} assistant messages): context trimmed to fit token limits]`
}

/**
 * Intelligently manage context based on token budget and priorities
 * @param {Object} options
 * @param {Array} options.messages - Full conversation
 * @param {string} options.model - Model being used
 * @param {number} options.maxContextTokens - Maximum context tokens
 * @param {boolean} options.compressFirst - Compress before trimming
 * @returns {{ messages: Array, stats: Object }}
 */
export function optimizeContext({
  messages = [],
  model = 'gpt-4o-mini',
  maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS,
  compressFirst = true,
}) {
  if (!Array.isArray(messages)) {
    return { messages: [], stats: { optimization: 'none', tokensRemoved: 0 } }
  }

  let working = messages
  let totalTokensRemoved = 0
  const stats = { originalTokens: countConversationTokens(messages), optimizations: [] }

  // Step 1: Compress if enabled
  if (compressFirst) {
    const compressed = compressConversation(working)
    if (compressed.tokensRemoved > 0) {
      working = compressed.messages
      totalTokensRemoved += compressed.tokensRemoved
      stats.optimizations.push('compression')
    }
  }

  // Step 2: Trim history if needed
  const trimmed = trimConversationHistory(working, maxContextTokens)
  if (trimmed.trimmed) {
    working = trimmed.messages
    totalTokensRemoved += trimmed.tokensRemoved
    stats.optimizations.push('trimming')
  }

  stats.finalTokens = countConversationTokens(working)
  stats.tokensRemoved = totalTokensRemoved
  stats.percentReduction = Math.round((totalTokensRemoved / stats.originalTokens) * 100)

  return {
    messages: working,
    stats,
  }
}

/**
 * Estimate if a request would fit within token budget
 * @param {Array} messages
 * @param {number} estimatedOutputTokens
 * @param {number} maxContextTokens
 * @returns {{ fits: boolean, shortfall: number }}
 */
export function willFitBudget(messages, estimatedOutputTokens = 1000, maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS) {
  const inputTokens = countConversationTokens(messages)
  const totalNeeded = inputTokens + estimatedOutputTokens
  const fits = totalNeeded <= maxContextTokens
  const shortfall = Math.max(0, totalNeeded - maxContextTokens)

  return { fits, shortfall, inputTokens, estimatedOutputTokens }
}

/**
 * Suggest an optimization strategy
 * @param {Array} messages
 * @param {number} maxContextTokens
 * @returns {Object}
 */
export function suggestOptimization(messages, maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS) {
  const currentTokens = countConversationTokens(messages)
  const isOverBudget = currentTokens > maxContextTokens

  if (!isOverBudget) {
    return {
      needed: false,
      message: `Current context is within budget (${currentTokens}/${maxContextTokens} tokens)`,
    }
  }

  const overflow = currentTokens - maxContextTokens
  const suggestions = []

  // Estimate what each optimization could save
  const compressResult = compressConversation(messages)
  if (compressResult.tokensRemoved > 0) {
    suggestions.push({
      strategy: 'compression',
      potentialSavings: compressResult.tokensRemoved,
      description: 'Remove redundant text and filler words',
    })
  }

  // Estimate trimming savings
  const nonSystemMessages = messages.filter(m => m.role !== 'system')
  if (nonSystemMessages.length > DEFAULT_MIN_MESSAGES) {
    const avgMessageSize = countConversationTokens(nonSystemMessages) / nonSystemMessages.length
    const trimSavings = Math.ceil(overflow / avgMessageSize) * avgMessageSize
    suggestions.push({
      strategy: 'trimming',
      potentialSavings: trimSavings,
      description: `Remove oldest ${Math.ceil(overflow / avgMessageSize)} messages`,
    })
  }

  suggestions.push({
    strategy: 'combined',
    potentialSavings: compressResult.tokensRemoved + (overflow * 1.5),
    description: 'Compress first, then trim history if needed',
  })

  return {
    needed: true,
    overflow,
    suggestions: suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings),
    recommendation: suggestions[0],
  }
}
