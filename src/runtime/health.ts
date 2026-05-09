import type { HealthResult } from './types.js'

export async function checkHealth(baseUrl: string): Promise<HealthResult> {
  const healthUrl = baseUrl.replace(/\/v1$/, '') + '/health'

  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })

    if (res.status === 503) {
      return { healthy: false, status: 'loading', modelLoaded: false }
    }

    if (!res.ok) {
      return { healthy: false, status: `HTTP ${res.status}`, modelLoaded: false }
    }

    const body = await res.text().catch(() => '')
    const modelLoaded = !body.includes('model_not_loaded') && res.status === 200

    return {
      healthy: true,
      status: body.trim().slice(0, 100) || 'ok',
      modelLoaded,
    }
  } catch (err: any) {
    return {
      healthy: false,
      status: 'unreachable',
      modelLoaded: false,
      error: err.message,
    }
  }
}

export async function waitForReady(
  baseUrl: string,
  timeoutMs = 120_000,
  onRetry?: (attempt: number) => void,
): Promise<HealthResult> {
  const start = Date.now()
  let attempt = 0

  while (Date.now() - start < timeoutMs) {
    attempt++
    const result = await checkHealth(baseUrl)
    if (result.healthy) return result
    onRetry?.(attempt)
    await new Promise((r) => setTimeout(r, 1500))
  }

  return {
    healthy: false,
    status: 'timeout',
    modelLoaded: false,
    error: `Runtime not ready after ${timeoutMs / 1000}s`,
  }
}
