import { homedir } from 'os'
import { join } from 'path'

export function locusHome(): string {
  return join(homedir(), '.locus')
}

export function modelsDir(): string {
  return join(locusHome(), 'models')
}

export function cacheDir(): string {
  return join(locusHome(), 'cache')
}
