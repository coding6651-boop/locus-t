import { platform, arch, release, hostname } from 'os'

export interface PlatformInfo {
  os: string
  arch: string
  release: string
  hostname: string
}

export function getPlatform(): PlatformInfo {
  return {
    os: platform(),
    arch: arch(),
    release: release(),
    hostname: hostname(),
  }
}

export function getPlatformLabel(): string {
  const p = getPlatform()
  return `${p.os} (${p.arch})`
}
