import type { LicensePayload } from './types.js'

export const EMBEDDED_PUBLIC_KEY_BASE64 = 'mVOj9chvY+77i6SGp09hJ6C/EuygmBb13pIVJ52Z7UA='

export function canonicalMessage(payload: Pick<LicensePayload, 'token' | 'user_id' | 'device_id' | 'expires_at'>): string {
  return `${payload.token}\n${payload.user_id}\n${payload.device_id}\n${payload.expires_at}`
}

export async function verifySignature(payload: LicensePayload, publicKeyBase64: string): Promise<boolean> {
  try {
    const keyBytes = Buffer.from(publicKeyBase64, 'base64')
    const sigBytes = Buffer.from(payload.signature, 'base64')
    const msgBytes = new TextEncoder().encode(canonicalMessage(payload))

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes, msgBytes)
  } catch {
    return false
  }
}
