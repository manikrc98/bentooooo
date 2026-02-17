/**
 * Rate limiter for LLM API calls.
 * Tracks requests per provider and enforces per-minute and per-second limits.
 */

const DEFAULT_REQUESTS_PER_MINUTE = 5
const DEFAULT_MIN_DELAY_MS = 500 // Minimum delay between requests

class RateLimiter {
  constructor(requestsPerMinute = DEFAULT_REQUESTS_PER_MINUTE, minDelayMs = DEFAULT_MIN_DELAY_MS) {
    this.requestsPerMinute = requestsPerMinute
    this.minDelayMs = minDelayMs
    this.requests = [] // Array of timestamps
    this.lastRequestTime = 0
  }

  /**
   * Check if a request is allowed and wait if necessary.
   * @returns {Promise<void>}
   */
  async waitIfNeeded() {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo)

    // Check if we've exceeded the per-minute limit
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = this.requests[0]
      const waitTime = (oldestRequest + 60000) - now + 100 // Add 100ms buffer
      if (waitTime > 0) {
        console.warn(`Rate limit: waiting ${Math.ceil(waitTime)}ms before next request`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        // Recurse to check again after waiting
        return this.waitIfNeeded()
      }
    }

    // Check minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minDelayMs) {
      const waitTime = this.minDelayMs - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Record this request
    this.requests.push(Date.now())
    this.lastRequestTime = Date.now()
  }

  /**
   * Get the number of requests made in the last minute.
   */
  getRecentRequestCount() {
    const oneMinuteAgo = Date.now() - 60000
    return this.requests.filter(time => time > oneMinuteAgo).length
  }

  /**
   * Reset the rate limiter.
   */
  reset() {
    this.requests = []
    this.lastRequestTime = 0
  }
}

// Per-provider rate limiters
const providers = new Map()

/**
 * Get or create a rate limiter for a provider.
 * @param {string} providerId
 * @param {number} requestsPerMinute
 * @returns {RateLimiter}
 */
export function getRateLimiter(providerId, requestsPerMinute = DEFAULT_REQUESTS_PER_MINUTE) {
  if (!providers.has(providerId)) {
    providers.set(providerId, new RateLimiter(requestsPerMinute))
  }
  return providers.get(providerId)
}

/**
 * Wrap a provider's chat method with rate limiting.
 * @param {Object} provider
 * @param {number|Function} requestsPerMinute - Number or function that takes options and returns RPM
 * @returns {Object} The wrapped provider
 */
export function wrapProviderWithRateLimit(provider, requestsPerMinute = DEFAULT_REQUESTS_PER_MINUTE) {
  const originalChat = provider.chat.bind(provider)
  const rateLimiters = new Map() // Store per-model rate limiters

  return {
    ...provider,
    async chat(messages, tools, options) {
      // Determine the actual rate limit for this request
      let rpm = typeof requestsPerMinute === 'function'
        ? requestsPerMinute(options)
        : requestsPerMinute

      // Get or create a rate limiter for this specific model
      const rateLimitKey = `${provider.id}-${options?.model || 'default'}`
      if (!rateLimiters.has(rateLimitKey)) {
        console.log(`[Rate Limiter] Creating new limiter for ${rateLimitKey} with ${rpm} RPM`)
        rateLimiters.set(rateLimitKey, new RateLimiter(rpm))
      }

      const rateLimiter = rateLimiters.get(rateLimitKey)
      console.log(`[Rate Limiter] Checking rate limit for ${rateLimitKey}, current requests in window: ${rateLimiter.getRecentRequestCount()}/${rpm}`)
      await rateLimiter.waitIfNeeded()
      return originalChat(messages, tools, options)
    },
  }
}
