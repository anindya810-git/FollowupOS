import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'pendingly-dev-fallback-key-change-me'
  return scryptSync(secret, 'pendingly-salt', 32)
}

export function encrypt(plain: string): string {
  if (!plain) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv(12) || tag(16) || ciphertext, base64
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(payload: string): string {
  if (!payload) return ''
  try {
    const buf = Buffer.from(payload, 'base64')
    // Legacy support: if this looks like plain base64 (not our format), try old decode
    if (buf.length < 28) {
      // Old format: just base64-encoded string
      return Buffer.from(payload, 'base64').toString('utf-8')
    }
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    // Fallback: try treating as old plain-base64 format for legacy data
    try { return Buffer.from(payload, 'base64').toString('utf-8') } catch { return '' }
  }
}
