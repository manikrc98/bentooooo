/**
 * Intelligent model selector for GitHub Models.
 * Chooses optimal model based on task complexity, cost, and available quota.
 *
 * Models available (free tier):
 * - gpt-4o-mini: Best for simple tasks, 150 requests/day
 * - gpt-4o: Best for complex tasks, 50 requests/day
 * - llama-3.3-70b: Open-source alternative, good for general tasks, 150 requests/day
 * - phi-4-mini: Lightweight, fast, efficient, 150 requests/day
 */

import { getTokenCounter } from './tokenCounter.js'

const MODELS = {
  'gpt-4o-mini': {
    label: 'GPT-4o Mini (Recommended)',
    complexity: ['simple', 'moderate'],
    bestFor: 'quick responses, chat, coding help, general questions',
    dailyLimit: 150,
    inputCost: 0.15,
    outputCost: 0.60,
    contextWindow: 128000,
    speedMs: 1000,
  },
  'gpt-4o': {
    label: 'GPT-4o (Premium)',
    complexity: ['moderate', 'complex'],
    bestFor: 'complex reasoning, code review, detailed analysis',
    dailyLimit: 50,
    inputCost: 2.50,
    outputCost: 10.0,
    contextWindow: 128000,
    speedMs: 2000,
  },
  'llama-3.3-70b': {
    label: 'Llama 3.3 70B',
    complexity: ['simple', 'moderate'],
    bestFor: 'general purpose, open-source alternative',
    dailyLimit: 150,
    inputCost: 0.71,
    outputCost: 0.71,
    contextWindow: 8192,
    speedMs: 1500,
  },
  'phi-4-mini': {
    label: 'Phi-4 Mini (Most Efficient)',
    complexity: ['simple'],
    bestFor: 'lightweight tasks, quick responses, maximum daily usage',
    dailyLimit: 150,
    inputCost: 0.08,
    outputCost: 0.30,
    contextWindow: 4096,
    speedMs: 800,
  },
}

const DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * Determine task complexity based on characteristics
 * @param {Object} options
 * @param {string} [options.prompt] - User prompt/message
 * @param {number} [options.conversationLength] - Number of messages in conversation
 * @param {Array} [options.tools] - Tools/functions to use
 * @returns {'simple'|'moderate'|'complex'}
 */
export function analyzeComplexity({ prompt = '', conversationLength = 0, tools = [] }) {
  let complexityScore = 0

  // Prompt length indicator
  const promptLength = prompt.length
  if (promptLength > 500) complexityScore += 2
  else if (promptLength > 200) complexityScore += 1

  // Conversation history indicator
  if (conversationLength > 10) complexityScore += 2
  else if (conversationLength > 5) complexityScore += 1

  // Tools/functions indicator
  if (tools && tools.length > 3) complexityScore += 2
  else if (tools && tools.length > 0) complexityScore += 1

  // Keywords indicating complex tasks
  const complexKeywords = [
    'analyze',
    'compare',
    'design',
    'architecture',
    'optimize',
    'debug',
    'refactor',
    'explain',
    'review',
  ]
  const hasComplexKeywords = complexKeywords.some(kw => prompt.toLowerCase().includes(kw))
  if (hasComplexKeywords) complexityScore += 2

  if (complexityScore >= 5) return 'complex'
  if (complexityScore >= 2) return 'moderate'
  return 'simple'
}

/**
 * Suggest best model based on multiple criteria
 * @param {Object} options
 * @param {string} [options.complexity] - Task complexity: 'simple', 'moderate', 'complex'
 * @param {string} [options.mode] - Selection mode: 'balanced' (default), 'cheap', 'fast', 'quality'
 * @param {boolean} [options.includeAvailability] - Consider daily limits
 * @returns {{ model: string, reason: string, alternatives: Array }}
 */
export function suggestModel({
  complexity = 'simple',
  mode = 'balanced',
  includeAvailability = true,
}) {
  const counter = getTokenCounter()
  const modelsWithStatus = Object.entries(MODELS).map(([id, config]) => {
    const daily = counter.getDailyUsage(id)
    const available = daily.requests < daily.limit.requests
    return { id, config, daily, available }
  })

  // Filter based on availability
  let candidates = includeAvailability
    ? modelsWithStatus.filter(m => m.available)
    : modelsWithStatus

  // Filter by complexity
  candidates = candidates.filter(m =>
    m.config.complexity.includes(complexity)
  )

  if (candidates.length === 0) {
    // Fallback: return any available model or default
    return {
      model: DEFAULT_MODEL,
      reason: 'No models matched criteria, using default',
      alternatives: [],
    }
  }

  // Score models based on mode
  let selectedModel
  let reason

  switch (mode) {
    case 'cheap': {
      // Sort by cost (input + output average)
      candidates.sort(
        (a, b) =>
          (a.config.inputCost + a.config.outputCost) -
          (b.config.inputCost + b.config.outputCost)
      )
      selectedModel = candidates[0]
      reason = `Selected for cost efficiency (${selectedModel.config.label})`
      break
    }

    case 'fast': {
      // Sort by speed
      candidates.sort((a, b) => a.config.speedMs - b.config.speedMs)
      selectedModel = candidates[0]
      reason = `Selected for speed (${selectedModel.config.label})`
      break
    }

    case 'quality': {
      // Sort by input cost (higher = better for this metric), then output
      candidates.sort(
        (a, b) =>
          (b.config.inputCost * 10 + b.config.outputCost) -
          (a.config.inputCost * 10 + a.config.outputCost)
      )
      selectedModel = candidates[0]
      reason = `Selected for best quality (${selectedModel.config.label})`
      break
    }

    case 'balanced':
    default: {
      // Prefer gpt-4o-mini for most cases due to balance of cost/quality
      const preferred = candidates.find(m => m.id === 'gpt-4o-mini')
      selectedModel = preferred || candidates[0]
      reason = `Selected for balanced cost/quality (${selectedModel.config.label})`
      break
    }
  }

  // Get alternatives
  const alternatives = candidates
    .filter(m => m.id !== selectedModel.id)
    .slice(0, 2)
    .map(m => ({
      model: m.id,
      label: m.config.label,
      reason: `${m.available ? 'Available' : 'Quota exceeded'}: ${m.config.bestFor}`,
      availableRequests: m.daily.limit.requests - m.daily.requests,
    }))

  return {
    model: selectedModel.id,
    reason,
    alternatives,
  }
}

/**
 * Get detailed info about a model
 * @param {string} modelId
 * @returns {Object|null}
 */
export function getModelInfo(modelId) {
  const model = MODELS[modelId]
  if (!model) return null

  const counter = getTokenCounter()
  const daily = counter.getDailyUsage(modelId)

  return {
    id: modelId,
    ...model,
    usage: {
      daily,
      requestsRemaining: Math.max(0, daily.limit.requests - daily.requests),
      inputTokensRemaining: Math.max(
        0,
        daily.limit.inputTokens - daily.inputTokens
      ),
      outputTokensRemaining: Math.max(
        0,
        daily.limit.outputTokens - daily.outputTokens
      ),
    },
  }
}

/**
 * List all available models
 * @param {Object} options
 * @param {boolean} [options.includeUsage] - Include usage stats
 * @param {boolean} [options.availableOnly] - Only show models with quota available
 * @returns {Array}
 */
export function listModels({ includeUsage = true, availableOnly = false }) {
  const counter = getTokenCounter()
  return Object.entries(MODELS).map(([id, config]) => {
    const daily = counter.getDailyUsage(id)
    const available = daily.requests < daily.limit.requests

    if (availableOnly && !available) return null

    return {
      id,
      label: config.label,
      bestFor: config.bestFor,
      ...(includeUsage && {
        requests: {
          used: daily.requests,
          limit: daily.limit.requests,
          remaining: daily.limit.requests - daily.requests,
          percentUsed: daily.percentUsed.requests,
        },
        tokens: {
          input: {
            used: daily.inputTokens,
            limit: daily.limit.inputTokens,
            percentUsed: daily.percentUsed.inputTokens,
          },
          output: {
            used: daily.outputTokens,
            limit: daily.limit.outputTokens,
            percentUsed: daily.percentUsed.outputTokens,
          },
        },
      }),
    }
  }).filter(m => m !== null)
}

/**
 * Get recommended model selection strategy based on remaining quota
 * @returns {Object}
 */
export function getQuotaStrategy() {
  const counter = getTokenCounter()
  const models = listModels({ includeUsage: true })

  const cheapest = models.sort(
    (a, b) =>
      (MODELS[a.id].inputCost + MODELS[a.id].outputCost) -
      (MODELS[b.id].inputCost + MODELS[b.id].outputCost)
  )[0]

  const mostRequests = models.sort(
    (a, b) => b.requests.remaining - a.requests.remaining
  )[0]

  const mostTokens = models.sort(
    (a, b) =>
      b.tokens.input.remaining +
      b.tokens.output.remaining -
      (a.tokens.input.remaining + a.tokens.output.remaining)
  )[0]

  return {
    bestForCost: cheapest,
    bestForRequests: mostRequests,
    bestForTokens: mostTokens,
    recommendation: mostRequests.id === mostTokens.id
      ? `Use ${mostRequests.label} - has most requests and tokens available`
      : `Use ${mostRequests.label} for requests or ${mostTokens.label} for token budget`,
  }
}
