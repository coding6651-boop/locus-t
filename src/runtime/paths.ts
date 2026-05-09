import { join } from 'path'

function appDataDir(): string {
  const env = process.env.LOCALAPPDATA || process.env.APPDATA || join(process.env.HOME || '', '.locus')
  return join(env, 'Locus')
}

export function runtimeDir(): string {
  return join(appDataDir(), 'runtime')
}

export function runtimeBinaryPath(): string {
  const name = process.platform === 'win32' ? 'locus-runtime.exe' : 'locus-runtime'
  return join(runtimeDir(), name)
}

export function runtimeVersionPath(): string {
  return join(runtimeDir(), 'version.txt')
}

export function runtimeManifestPath(): string {
  return join(runtimeDir(), 'manifest.json')
}

export function runtimeLogPath(): string {
  return join(runtimeDir(), 'runtime.log')
}
