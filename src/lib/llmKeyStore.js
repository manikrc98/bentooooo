import { supabase } from './supabase.js'
import { encrypt, decrypt } from './crypto.js'

const VALID_PROVIDERS = ['github']

/**
 * Fetch and decrypt all LLM API keys for a user.
 * @param {string} userId
 * @returns {Promise<Record<string, string>>} e.g. { openai: 'sk-...', gemini: 'AI...' }
 */
export async function getKeys(userId) {
  const { data, error } = await supabase
    .from('llm_keys')
    .select('provider, encrypted_key, iv, salt')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to fetch keys: ${error.message}`)

  const keys = {}
  for (const row of data) {
    try {
      keys[row.provider] = await decrypt(
        { ciphertext: row.encrypted_key, iv: row.iv, salt: row.salt },
        userId
      )
    } catch {
      // Skip keys that fail to decrypt (shouldn't happen, but be safe)
    }
  }
  return keys
}

/**
 * Encrypt and store (upsert) an API key for a provider.
 * @param {string} userId
 * @param {string} provider - 'openai' | 'gemini' | 'anthropic'
 * @param {string} apiKey - plaintext key
 */
export async function setKey(userId, provider, apiKey) {
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`)
  }

  const { ciphertext, iv, salt } = await encrypt(apiKey, userId)

  const { error } = await supabase
    .from('llm_keys')
    .upsert(
      {
        user_id: userId,
        provider,
        encrypted_key: ciphertext,
        iv,
        salt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

  if (error) throw new Error(`Failed to save key: ${error.message}`)
}

/**
 * Remove an API key for a provider.
 * @param {string} userId
 * @param {string} provider
 */
export async function removeKey(userId, provider) {
  const { error } = await supabase
    .from('llm_keys')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)

  if (error) throw new Error(`Failed to remove key: ${error.message}`)
}

/**
 * Get list of providers that have keys configured.
 * @param {string} userId
 * @returns {Promise<string[]>} e.g. ['openai', 'gemini']
 */
export async function getConfiguredProviders(userId) {
  const { data, error } = await supabase
    .from('llm_keys')
    .select('provider')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to fetch providers: ${error.message}`)
  return data.map(row => row.provider)
}
