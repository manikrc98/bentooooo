/**
 * Smart chat wrapper that implements token optimization and quota management.
 *
 * Recommended configuration:
 * - Model Selection: Auto-analyze complexity
 * - Context Optimization: Optimize only if needed
 * - Token Budget: 4000 tokens max
 * - Warning Threshold: 80%
 */

import { analyzeComplexity, suggestModel } from './modelSelector.js'
import { optimizeContext } from './contextOptimizer.js'
import { getTokenCounter, initializeTokenCounter } from './tokenCounter.js'

// Configuration
const CONFIG = {
  maxContextTokens: 4000,
  warningThreshold: 80,
  autoAnalyzeComplexity: true,
  autoOptimize: true,
}

/**
 * Initialize smart chat (call once on app startup)
 */
export function initializeSmartChat() {
  initializeTokenCounter()
}

/**
 * Smart chat wrapper that handles:
 * 1. Model selection based on complexity
 * 2. Context optimization if needed
 * 3. Limit checking and warnings
 * 4. Automatic tracking
 *
 * @param {string} userMessage - The user's message
 * @param {Array} chatHistory - Existing message history
 * @param {Object} provider - LLM provider instance
 * @param {Object} options
 * @param {string} [options.model] - Force specific model (overrides auto-selection)
 * @param {string} [options.complexity] - Pre-analyzed complexity (skips analysis)
 * @returns {Promise<{ messages: Array, model: string, metadata: Object }>}
 */
export async function smartChat(userMessage, chatHistory, provider, options = {}) {
  const counter = getTokenCounter()

  // Step 1: Determine complexity (unless provided)
  let complexity = options.complexity
  if (!complexity && CONFIG.autoAnalyzeComplexity) {
    complexity = analyzeComplexity({
      prompt: userMessage,
      conversationLength: chatHistory.length,
    })
  }

  // Step 2: Select model (unless forced)
  let model = options.model
  if (!model) {
    const suggestion = suggestModel({
      complexity: complexity || 'moderate',
      mode: 'balanced',
      includeAvailability: true,
    })
    model = suggestion.model
  }

  // Step 3: Build messages
  let messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ]

  // Step 4: Check limits and optimize if needed
  const { allowed, warnings } = counter.checkLimits(model)

  // Log hard limit violations
  const hardLimits = warnings.filter(w => !w.startsWith('⚠️'))
  if (hardLimits.length > 0) {
    console.error('[Smart Chat] Hard limits would be exceeded:', hardLimits)
  }

  // Optimize if auto-optimize enabled and limits are tight
  if (CONFIG.autoOptimize && !allowed) {
    const optimized = optimizeContext({
      messages,
      model,
      maxContextTokens: CONFIG.maxContextTokens,
    })
    messages = optimized.messages

    // Check again after optimization
    const retryCheck = counter.checkLimits(model)
    if (retryCheck.allowed) {
      console.log('[Smart Chat] Context optimized to fit within limits')
    }
  }

  // Log soft warnings (approaching limits)
  const softWarnings = warnings.filter(w => w.startsWith('⚠️'))
  softWarnings.forEach(w => console.warn('[Smart Chat] ' + w))

  return {
    messages,
    model,
    metadata: {
      complexity,
      modelReason: `Using ${model} for ${complexity} task`,
      warnings: softWarnings,
      quotaInfo: counter.getDailyUsage(model),
    },
  }
}

/**
 * Build system prompt (placeholder - customize as needed)
 * @returns {string}
 */
function buildSystemPrompt() {
  return 'You are a helpful assistant. Be concise and accurate in your responses.'
}

/**
 * Get current quota status
 * @param {string} [model] - Specific model or all
 * @returns {Object}
 */
export function getQuotaStatus(model) {
  const counter = getTokenCounter()
  if (model) {
    return counter.getDailyUsage(model)
  }
  return counter.getReport()
}

/**
 * Check if quota is critically low (> 80%)
 * @param {string} model
 * @returns {boolean}
 */
export function isQuotaCritical(model) {
  const status = getQuotaStatus(model)
  return status.percentUsed.requests > CONFIG.warningThreshold
}

/**
 * Get quota warning message for UI
 * @param {string} model
 * @returns {string|null}
 */
export function getQuotaWarning(model) {
  const status = getQuotaStatus(model)
  const threshold = CONFIG.warningThreshold

  if (status.percentUsed.requests > threshold) {
    const remaining = status.limit.requests - status.requests
    return `⚠️ Only ${remaining} requests remaining today (${100 - status.percentUsed.requests}%)`
  }

  if (status.percentUsed.inputTokens > threshold) {
    return `⚠️ Input tokens at ${status.percentUsed.inputTokens}% capacity`
  }

  if (status.percentUsed.outputTokens > threshold) {
    return `⚠️ Output tokens at ${status.percentUsed.outputTokens}% capacity`
  }

  return null
}

/**
 * Update configuration
 * @param {Object} newConfig - Partial config to merge
 */
export function updateConfig(newConfig) {
  Object.assign(CONFIG, newConfig)
}

/**
 * Get current configuration
 * @returns {Object}
 */
export function getConfig() {
  return { ...CONFIG }
}

/**
 * Reset daily quota (useful for testing)
 * @param {string} [model] - Specific model or all
 */
export function resetQuota(model) {
  const counter = getTokenCounter()
  counter.resetDaily(model)
}
