import type { AppConfig } from './defaults.js'

const BASE_SCHEMA = {
  baseURL: { type: 'string', required: true },
  model: { type: 'string', required: true },
  temperature: { type: 'number', required: false, min: 0, max: 2 },
  maxTokens: { type: 'number', required: false, min: 256, max: 131072 },
}

export function validateConfig(config: Partial<AppConfig>): string[] {
  const errors: string[] = []
  for (const [key, rule] of Object.entries(BASE_SCHEMA)) {
    if (rule.required && !(key in config)) errors.push(`Missing required: ${key}`)
  }
  return errors
}
