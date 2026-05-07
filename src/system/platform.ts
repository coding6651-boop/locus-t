import { platform, arch, release } from 'os'

export interface PlatformInfo {
  os: string
  arch: string
  release: string
}

export function getPlatform(): PlatformInfo {
  return { os: platform(), arch: arch(), release: release() }
}
