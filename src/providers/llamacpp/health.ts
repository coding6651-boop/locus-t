import type { HealthResult } from './types.js'

export async function checkHealth(baseUrl: string): Promise<HealthResult> {
  const healthUrl = baseUrl.replace(/\/v1$/, '') + '/health'

  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) {
      return { healthy: false, status: `HTTP ${res.status}`, modelLoaded: false }
    }

    const body = await res.text()
    const modelLoaded = body.includes('model_loaded') || body.includes('ok')

    return {
      healthy: true,
      status: body.trim().slice(0, 100),
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
  timeoutMs = 60_000,
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
    error: `Server not ready after ${timeoutMs / 1000}s`,
  }
}

export async function checkModelLoaded(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/v1$/, '')}/v1/models`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Array.isArray(data?.data) && data.data.length > 0
  } catch {
    return false
  }
}
