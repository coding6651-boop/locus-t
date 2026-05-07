import type { AppConfig } from './defaults.js'
import { defaults } from './defaults.js'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

function resolveStorageDir(): string {
  return join(homedir(), '.locus')
}

export function loadConfig(): AppConfig {
  const config: AppConfig = { ...defaults, storageDir: resolveStorageDir() }

  const configPaths = [
    join(process.cwd(), 'locus.config.json'),
    join(resolveStorageDir(), 'config.json'),
  ]

  for (const cp of configPaths) {
    if (existsSync(cp)) {
      try {
        const overrides = JSON.parse(readFileSync(cp, 'utf-8'))
        Object.assign(config, overrides)
        config.storageDir = config.storageDir || resolveStorageDir()
      } catch { /* skip invalid config */ }
    }
  }

  config.baseURL = process.env.LOCUS_BASE_URL || config.baseURL
  config.model = process.env.LOCUS_MODEL || config.model
  config.temperature = parseFloat(process.env.LOCUS_TEMPERATURE || String(config.temperature))
  config.maxTokens = parseInt(process.env.LOCUS_MAX_TOKENS || String(config.maxTokens), 10)
  config.host = process.env.LOCUS_HOST || config.host
  config.port = parseInt(process.env.LOCUS_PORT || String(config.port), 10)
  config.modelPath = process.env.LOCUS_MODEL_PATH || config.modelPath
  config.binaryPath = process.env.LOCUS_BINARY_PATH || config.binaryPath
  config.nCtx = parseInt(process.env.LOCUS_N_CTX || String(config.nCtx), 10)
  config.nGpuLayers = parseInt(process.env.LOCUS_N_GPU_LAYERS || String(config.nGpuLayers), 10)

  return config
}
