/**
 * Token usage counter and analyzer for GitHub Models.
 * Tracks input/output token usage to optimize within API limits.
 *
 * GitHub Models Free Tier Limits:
 * - GPT-4o mini: 150 requests/day, 8k input tokens/min, 4k output tokens/min
 * - GPT-4o: 50 requests/day, 8k input tokens/min, 4k output tokens/min
 * - Llama/Phi: 150 requests/day
 */

// Rough token estimation (1 token ≈ 4 characters)
const APPROX_CHARS_PER_TOKEN = 4

// Daily limits for free tier (can be customized per model)
const DAILY_LIMITS = {
  'gpt-4o': { requests: 50, inputTokens: 200000, outputTokens: 50000 },
  'gpt-4o-mini': { requests: 150, inputTokens: 600000, outputTokens: 200000 },
  'llama-2-70b': { requests: 150, inputTokens: 600000, outputTokens: 200000 },
  'llama-3-70b': { requests: 150, inputTokens: 600000, outputTokens: 200000 },
  'phi-4-mini': { requests: 150, inputTokens: 600000, outputTokens: 200000 },
  'default': { requests: 100, inputTokens: 400000, outputTokens: 150000 },
}

// Per-minute limits (across all requests)
const MINUTE_LIMITS = {
  inputTokens: 8000,
  outputTokens: 4000,
}

/**
 * Estimate token count from text
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN)
}

/**
 * Count tokens in a message
 * @param {Object} message
 * @returns {number}
 */
export function countMessageTokens(message) {
  if (!message) return 0

  let tokens = 10 // Overhead for message structure

  if (message.content) {
    tokens += estimateTokens(message.content)
  }

  if (message.toolCalls) {
    message.toolCalls.forEach(tc => {
      tokens += estimateTokens(tc.name)
      tokens += estimateTokens(JSON.stringify(tc.arguments))
    })
  }

  if (message.toolCallId) {
    tokens += estimateTokens(message.toolCallId)
  }

  return tokens
}

/**
 * Count total tokens in conversation
 * @param {Array} messages
 * @returns {number}
 */
export function countConversationTokens(messages) {
  if (!Array.isArray(messages)) return 0
  return messages.reduce((sum, msg) => sum + countMessageTokens(msg), 0)
}

/**
 * Token usage tracking
 */
class TokenCounter {
  constructor() {
    this.dailyUsage = new Map() // model -> { requests, inputTokens, outputTokens, resetTime }
    this.minuteUsage = [] // Array of { timestamp, inputTokens, outputTokens }
  }

  /**
   * Record input tokens for a request
   * @param {string} model
   * @param {number} tokens
   */
  recordInput(model, tokens) {
    const now = Date.now()
    this._ensureDailyEntry(model)
    this._ensureMinuteEntry(now)

    const daily = this.dailyUsage.get(model)
    daily.inputTokens += tokens

    const minute = this.minuteUsage[this.minuteUsage.length - 1]
    minute.inputTokens += tokens

    this._persistToStorage()
  }

  /**
   * Record output tokens for a request
   * @param {string} model
   * @param {number} tokens
   */
  recordOutput(model, tokens) {
    const now = Date.now()
    this._ensureDailyEntry(model)
    this._ensureMinuteEntry(now)

    const daily = this.dailyUsage.get(model)
    daily.outputTokens += tokens

    const minute = this.minuteUsage[this.minuteUsage.length - 1]
    minute.outputTokens += tokens

    this._persistToStorage()
  }

  /**
   * Record a request for a model
   * @param {string} model
   */
  recordRequest(model) {
    this._ensureDailyEntry(model)
    const daily = this.dailyUsage.get(model)
    daily.requests += 1

    this._persistToStorage()
  }

  /**
   * Get current daily usage for a model
   * @param {string} model
   * @returns {{ requests: number, inputTokens: number, outputTokens: number, limit: object, percentUsed: object }}
   */
  getDailyUsage(model) {
    this._ensureDailyEntry(model)
    const usage = this.dailyUsage.get(model)
    const limit = DAILY_LIMITS[model] || DAILY_LIMITS.default

    return {
      requests: usage.requests,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      limit,
      percentUsed: {
        requests: Math.round((usage.requests / limit.requests) * 100),
        inputTokens: Math.round((usage.inputTokens / limit.inputTokens) * 100),
        outputTokens: Math.round((usage.outputTokens / limit.outputTokens) * 100),
      },
    }
  }

  /**
   * Get current minute usage
   * @returns {{ inputTokens: number, outputTokens: number, percentUsed: object }}
   */
  getMinuteUsage() {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Cleanup old entries
    while (this.minuteUsage.length > 0 && this.minuteUsage[0].timestamp < oneMinuteAgo) {
      this.minuteUsage.shift()
    }

    if (this.minuteUsage.length === 0) {
      return { inputTokens: 0, outputTokens: 0, percentUsed: { input: 0, output: 0 } }
    }

    const minute = this.minuteUsage[this.minuteUsage.length - 1]
    return {
      inputTokens: minute.inputTokens,
      outputTokens: minute.outputTokens,
      percentUsed: {
        input: Math.round((minute.inputTokens / MINUTE_LIMITS.inputTokens) * 100),
        output: Math.round((minute.outputTokens / MINUTE_LIMITS.outputTokens) * 100),
      },
    }
  }

  /**
   * Check if limits would be exceeded
   * @param {string} model
   * @param {number} estimatedInputTokens
   * @param {number} estimatedOutputTokens
   * @returns {{ allowed: boolean, warnings: string[] }}
   */
  checkLimits(model, estimatedInputTokens = 0, estimatedOutputTokens = 0) {
    const warnings = []
    const daily = this.getDailyUsage(model)
    const minute = this.getMinuteUsage()

    // Check daily request limit
    if (daily.requests >= daily.limit.requests) {
      warnings.push(`Daily request limit (${daily.limit.requests}) exceeded for ${model}`)
      return { allowed: false, warnings }
    }

    // Check input tokens (daily)
    if (daily.inputTokens + estimatedInputTokens > daily.limit.inputTokens) {
      warnings.push(`Daily input token limit exceeded for ${model}`)
    }

    // Check output tokens (daily)
    if (daily.outputTokens + estimatedOutputTokens > daily.limit.outputTokens) {
      warnings.push(`Daily output token limit exceeded for ${model}`)
    }

    // Check minute limits
    if (minute.inputTokens + estimatedInputTokens > MINUTE_LIMITS.inputTokens) {
      warnings.push(`Per-minute input token limit (${MINUTE_LIMITS.inputTokens}) would be exceeded`)
    }

    if (minute.outputTokens + estimatedOutputTokens > MINUTE_LIMITS.outputTokens) {
      warnings.push(`Per-minute output token limit (${MINUTE_LIMITS.outputTokens}) would be exceeded`)
    }

    // Warnings for approaching limits
    if (daily.percentUsed.requests > 80) {
      warnings.push(`⚠️  Daily requests at ${daily.percentUsed.requests}% capacity`)
    }
    if (daily.percentUsed.inputTokens > 80) {
      warnings.push(`⚠️  Daily input tokens at ${daily.percentUsed.inputTokens}% capacity`)
    }
    if (daily.percentUsed.outputTokens > 80) {
      warnings.push(`⚠️  Daily output tokens at ${daily.percentUsed.outputTokens}% capacity`)
    }

    const allowed = warnings.filter(w => !w.startsWith('⚠️')).length === 0
    return { allowed, warnings }
  }

  /**
   * Reset daily usage (call once per day)
   * @param {string} [model] - Specific model or all if not provided
   */
  resetDaily(model) {
    if (model) {
      this.dailyUsage.delete(model)
    } else {
      this.dailyUsage.clear()
    }
  }

  /**
   * Get usage report
   * @returns {Object}
   */
  getReport() {
    const report = {}
    for (const [model, usage] of this.dailyUsage) {
      const daily = this.getDailyUsage(model)
      report[model] = daily
    }
    return report
  }

  _ensureDailyEntry(model) {
    if (!this.dailyUsage.has(model)) {
      this.dailyUsage.set(model, {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        resetTime: Date.now(),
      })
    }
  }

  _ensureMinuteEntry(now) {
    if (this.minuteUsage.length === 0) {
      this.minuteUsage.push({ timestamp: now, inputTokens: 0, outputTokens: 0 })
    }
  }

  /**
   * Load usage from localStorage
   */
  _loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return
      const today = new Date().toISOString().split('T')[0]
      const lastReset = localStorage.getItem('github_models_last_reset_date')

      if (lastReset === today) {
        const stored = localStorage.getItem('github_models_daily_usage')
        if (stored) {
          const data = JSON.parse(stored)
          for (const [model, usage] of Object.entries(data)) {
            this.dailyUsage.set(model, usage)
          }
        }
      } else {
        this.resetDaily()
        localStorage.setItem('github_models_last_reset_date', today)
      }
    } catch (err) {
      // Silently fail if storage not available
    }
  }

  /**
   * Save usage to localStorage
   */
  _persistToStorage() {
    try {
      if (typeof localStorage === 'undefined') return
      const data = {}
      for (const [model, usage] of this.dailyUsage) {
        data[model] = usage
      }
      localStorage.setItem('github_models_daily_usage', JSON.stringify(data))
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem('github_models_last_reset_date', today)
    } catch (err) {
      // Silently fail if storage not available
    }
  }
}

// Global instance
const globalCounter = new TokenCounter()

/**
 * Initialize counter and load from storage
 */
export function initializeTokenCounter() {
  globalCounter._loadFromStorage()
}

/**
 * Get the global token counter
 * @returns {TokenCounter}
 */
export function getTokenCounter() {
  return globalCounter
}

/**
 * Get usage statistics
 * @param {string} [model]
 * @returns {Object}
 */
export function getUsageStats(model) {
  if (model) {
    return globalCounter.getDailyUsage(model)
  }
  return {
    daily: globalCounter.getReport(),
    minute: globalCounter.getMinuteUsage(),
  }
}
