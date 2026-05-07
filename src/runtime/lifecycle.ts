import { mkdirSync, existsSync } from 'fs'
import { getConfig } from './state.js'
import { locusHome, modelsDir, cacheDir, sessionsDir, logsDir } from '../system/paths.js'
import { join } from 'path'
import pc from 'picocolors'

const DIRS = [locusHome, modelsDir, cacheDir, sessionsDir, logsDir]

export function startLifecycle(): void {
  const config = getConfig()

  for (const dirFn of DIRS) {
    const dir = dirFn()
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  const binDir = join(locusHome(), 'bin')
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true })

  if (config.storageDir && !existsSync(config.storageDir)) {
    mkdirSync(config.storageDir, { recursive: true })
  }

  process.stdout.write(pc.dim('  Runtime initialized\n'))
}

export function stopLifecycle(): void {
}
