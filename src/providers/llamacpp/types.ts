export interface ServerConfig {
  host: string
  port: number
  modelPath: string
  binaryPath?: string
  nCtx: number
  nGpuLayers: number
  verbose: boolean
}

export interface ServerStatus {
  running: boolean
  pid: number | null
  port: number
  model: string
  uptime: number
}

export interface HealthResult {
  healthy: boolean
  status: string
  modelLoaded: boolean
  error?: string
}
