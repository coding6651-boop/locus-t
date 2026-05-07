import type { AppConfig } from '../config/defaults.js'
import { loadConfig } from '../config/loader.js'

let config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!config) config = loadConfig()
  return config
}

export function setConfig(c: AppConfig): void {
  config = c
}
