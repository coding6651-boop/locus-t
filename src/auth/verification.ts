import type { LicensePayload, VerifyResult } from './types.js'
import { read } from './storage.js'
import { getDeviceId } from './device.js'
import { verifySignature, EMBEDDED_PUBLIC_KEY_BASE64 } from './crypto.js'

export async function verifyLicense(): Promise<VerifyResult> {
  const raw = read()
  if (!raw) {
    return { ok: false, code: 'missing', message: 'No license found. Run `colx activate` to activate.' }
  }

  let payload: LicensePayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return { ok: false, code: 'malformed', message: 'License file is corrupted or invalid.' }
  }

  return await verifyPayload(payload)
}

export async function verifyPayload(payload: LicensePayload): Promise<VerifyResult> {
  if (!payload.token || !payload.user_id || !payload.device_id || !payload.expires_at || !payload.signature) {
    return { ok: false, code: 'malformed', message: 'License payload is missing required fields.' }
  }

  if (
    typeof payload.token !== 'string' ||
    typeof payload.user_id !== 'string' ||
    typeof payload.device_id !== 'string' ||
    typeof payload.expires_at !== 'string' ||
    typeof payload.signature !== 'string'
  ) {
    return { ok: false, code: 'malformed', message: 'License payload contains invalid field types.' }
  }

  const device = getDeviceId()
  if (payload.device_id !== device.id) {
    return { ok: false, code: 'device_mismatch', message: 'License is bound to a different device.' }
  }

  const expiresAt = new Date(payload.expires_at).getTime()
  if (isNaN(expiresAt)) {
    return { ok: false, code: 'malformed', message: 'License has an invalid expiration date.' }
  }
  if (Date.now() >= expiresAt) {
    return { ok: false, code: 'expired', message: 'License has expired. Run `colx activate` with a new token.' }
  }

  const envPublicKey = process.env.COLX_AUTH_PUBLIC_KEY
  const publicKey = envPublicKey || EMBEDDED_PUBLIC_KEY_BASE64
  if (!publicKey) {
    return { ok: false, code: 'config_error', message: 'No public key configured for license verification.' }
  }

  const valid = await verifySignature(payload, publicKey)
  if (!valid) {
    return { ok: false, code: 'invalid_signature', message: 'License signature is invalid. The license may have been tampered with.' }
  }

  return { ok: true, license: payload }
}
