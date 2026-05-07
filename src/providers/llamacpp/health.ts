import type { LLMConfig } from '../types.js'

export async function checkHealth(config: LLMConfig): Promise<boolean> {
  try {
    const res = await fetch(`${config.baseURL.replace(/\/v1$/, '')}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}
