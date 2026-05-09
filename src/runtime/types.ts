export interface ManifestFile {
  name: string
  rename?: string
  optional?: boolean
}

export interface PlatformEntry {
  os: string
  arch: string
  variant: string
  zipUrl: string
  sha256: string
  sizeBytes: number
  files: ManifestFile[]
}

export interface RuntimeManifest {
  version: string
  description: string
  urlTemplate: string
  platforms: PlatformEntry[]
}

export interface RuntimeStatus {
  running: boolean
  pid: number | null
  port: number
  uptime: number
  model: string
}

export interface HealthResult {
  healthy: boolean
  status: string
  modelLoaded: boolean
  error?: string
}
