const DEFAULT_BASE_URL = 'http://127.0.0.1:8080/v1'
const DEFAULT_MODEL = 'qwen2.5-coder-7b-instruct'

export interface AppConfig {
  baseURL: string
  model: string
  temperature: number
  maxTokens: number
  storageDir: string
}

export const defaults: AppConfig = {
  baseURL: DEFAULT_BASE_URL,
  model: DEFAULT_MODEL,
  temperature: 0.1,
  maxTokens: 8192,
  storageDir: '',
}
