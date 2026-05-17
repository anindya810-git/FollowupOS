import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'

export class DecryptError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecryptError'
  }
}

function getKey(): Buffer {
  const explicit = process.env.ENCRYPTION_KEY
  if (explicit) return scryptSync(explicit, 'pendingly-salt', 32)

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Generate one with: openssl rand -hex 32'
    )
  }

  // Dev-only fallback to NEXTAUTH_SECRET so local dev works without two secrets.
  // Loud warning so devs notice they need a distinct ENCRYPTION_KEY before prod.
  const dev = process.env.NEXTAUTH_SECRET
  if (dev) {
    console.warn(
      '[crypto] DEV: ENCRYPTION_KEY not set, falling back to NEXTAUTH_SECRET. ' +
      'Set ENCRYPTION_KEY explicitly before storing real data.'
    )
    return scryptSync(dev, 'pendingly-salt', 32)
  }

  console.warn(
    '[crypto] WARNING: no encryption secret set. Using insecure dev fallback.'
  )
  return scryptSync('pendingly-dev-fallback-key-change-me', 'pendingly-salt', 32)
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
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < 28) {
    // Too short to be our format. Don't pretend it decoded successfully —
    // returning garbage here previously led to silent auth failures with the
    // ciphertext echoed back to clients via error messages.
    throw new DecryptError('Encrypted payload is too short or malformed')
  }
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  try {
    const decipher = createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    throw new DecryptError('Failed to decrypt — wrong key or tampered ciphertext')
  }
}
