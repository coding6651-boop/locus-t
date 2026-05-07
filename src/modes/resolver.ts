import type { LLMConfig } from '../providers/types.js'

export function resolveProviderForMode(): 'llamacpp' | 'ollama' {
  return 'llamacpp'
}
