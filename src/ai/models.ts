export interface ModelConfig {
  name: string
  provider: 'llamacpp' | 'ollama'
  contextLength: number
  recommendedRam: number
}

export const DEFAULT_MODEL: ModelConfig = {
  name: 'qwen2.5-coder-7b-instruct',
  provider: 'llamacpp',
  contextLength: 32768,
  recommendedRam: 8,
}
