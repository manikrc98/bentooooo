import { createGitHubModelsProvider } from './githubModelsProvider.js'
import { wrapProviderWithRateLimit } from './rateLimiter.js'

export { LLMError } from './types.js'

/**
 * Rate limit configuration per provider (requests per minute)
 * GitHub Models limits:
 * - GPT-4o: 50 requests/day = ~2-3 requests per hour
 * - GPT-4o-mini: 150 requests/day = ~6 requests per hour
 * - Llama/Phi: 150 requests/day = ~6 requests per hour
 *
 * To avoid hitting daily limits, we use conservative per-minute limits
 * and rely on daily tracking in tokenCounter.js
 */
const PROVIDER_RATE_LIMITS = {
  github: (options) => {
    // Variable rate limit based on model
    const model = options?.model || 'gpt-4o-mini'
    if (model === 'gpt-4o') return 2 // 50/day = ~2 per hour max
    return 5 // Others get 5 per minute (conservative)
  },
}

const PROVIDERS = {
  github: { factory: createGitHubModelsProvider, label: 'GitHub Models' },
}

/**
 * Create an LLM provider instance with rate limiting.
 * @param {'github'} providerId
 * @param {string} apiKey
 * @returns {{ id: string, name: string, chat: Function, validateKey: Function }}
 */
export function createProvider(providerId, apiKey) {
  const entry = PROVIDERS[providerId]
  if (!entry) throw new Error(`Unknown provider: ${providerId}`)
  const provider = entry.factory(apiKey)

  const rateLimit = PROVIDER_RATE_LIMITS[providerId] || 60
  return wrapProviderWithRateLimit(provider, rateLimit)
}

/**
 * Get metadata about all supported providers.
 */
export function getProviderList() {
  return Object.entries(PROVIDERS).map(([id, { label }]) => ({ id, label }))
}
