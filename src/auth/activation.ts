import type { ActivationResult } from './types.js'
import type { LicensePayload } from './types.js'
import { getDeviceId } from './device.js'
import { verifyPayload } from './verification.js'
import { write } from './storage.js'
import { getConfig } from '../runtime/state.js'

function isNetworkError(message: string): boolean {
  const patterns = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'fetch failed', 'abort', 'unable to reach']
  return patterns.some(p => message.toLowerCase().includes(p.toLowerCase()))
}

export async function activateLicense(
  token: string,
  onProgress?: (status: string) => void,
): Promise<ActivationResult> {
  const device = getDeviceId()
  const cfg = getConfig()
  const activateUrl = process.env.LOCUS_AUTH_URL || cfg.authUrl
  const maxRetries = parseInt(process.env.LOCUS_AUTH_MAX_RETRIES || String(cfg.authMaxRetries), 10)
  const timeoutMs = parseInt(process.env.LOCUS_AUTH_TIMEOUT_MS || String(cfg.authTimeoutMs), 10)

  let lastError = ''

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        onProgress?.(`Retrying in ${(delay / 1000).toFixed(1)}s...`)
        await new Promise(r => setTimeout(r, delay))
      }

      onProgress?.(`Contacting activation server (attempt ${attempt + 1}/${maxRetries})...`)

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(activateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, device_id: device.id }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const code: string = body.code || 'unknown'
        const message: string = body.message || `Server returned ${response.status}`

        if (response.status >= 400 && response.status < 500) {
          return { ok: false, code, message }
        }

        lastError = message
        continue
      }

      const data = (await response.json()) as LicensePayload

      const result = await verifyPayload(data)
      if (!result.ok) {
        return { ok: false, code: result.code, message: `Server returned invalid license: ${result.message}` }
      }

      write(JSON.stringify(data, null, 2))

      return {
        ok: true,
        license: data,
        warnings: device.warnings.length > 0 ? device.warnings : undefined,
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = 'Activation request timed out.'
      } else {
        lastError = err.message || 'Unknown error during activation.'
      }

      if (!isNetworkError(lastError) && attempt < maxRetries - 1) continue
    }
  }

  return { ok: false, code: 'network_error', message: `Unable to reach activation server: ${lastError}` }
}
