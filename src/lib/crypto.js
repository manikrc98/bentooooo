/**
 * Encryption utilities using Web Crypto API (AES-GCM + PBKDF2)
 * Used to encrypt API keys before storing in Supabase.
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 100_000

function base64Encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function base64Decode(str) {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function deriveKey(userId, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext
 * @param {string} userId - used as key derivation input
 * @returns {Promise<{ ciphertext: string, iv: string, salt: string }>}
 */
export async function encrypt(plaintext, userId) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(userId, salt)
  const encoded = new TextEncoder().encode(plaintext)
  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  return {
    ciphertext: base64Encode(cipherBuffer),
    iv: base64Encode(iv),
    salt: base64Encode(salt),
  }
}

/**
 * Decrypt an encrypted payload.
 * @param {{ ciphertext: string, iv: string, salt: string }} data
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function decrypt(data, userId) {
  const salt = new Uint8Array(base64Decode(data.salt))
  const iv = new Uint8Array(base64Decode(data.iv))
  const cipherBuffer = base64Decode(data.ciphertext)
  const key = await deriveKey(userId, salt)
  const plainBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, cipherBuffer)
  return new TextDecoder().decode(plainBuffer)
}
