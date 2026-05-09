import { existsSync, statSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

function appDataDir(): string {
  const env = process.env.LOCALAPPDATA || process.env.APPDATA || join(homedir(), '.locus')
  return join(env, 'Locus')
}

const BINARY_NAMES = process.platform === 'win32'
  ? ['llama-server.exe', 'llama-server', 'locus-runtime.exe']
  : ['llama-server', 'llama-server-main', 'locus-runtime']

const SEARCH_PATHS = [
  process.cwd(),
  join(homedir(), '.locus', 'bin'),
  join(appDataDir(), 'runtime'),
  join(homedir(), '.local', 'bin'),
  '/usr/local/bin',
  '/usr/bin',
]

export function findBinary(customPath?: string): string | null {
  if (customPath && existsSync(customPath)) return customPath

  const pathEnv = (process.env.PATH || '')
    .split(process.platform === 'win32' ? ';' : ':')
    .map((p) => p.trim())
    .filter(Boolean)

  for (const name of BINARY_NAMES) {
    for (const dir of [...SEARCH_PATHS, ...pathEnv]) {
      if (!dir) continue
      const full = join(dir, name)
      try {
        if (existsSync(full) && statSync(full).isFile()) return full
      } catch { }
    }

    try {
      execSync(`${name} --version`, { stdio: 'ignore', windowsHide: true })
      return name
    } catch { }
  }

  return null
}

export function findModel(customPath?: string): string | null {
  if (customPath && existsSync(customPath)) return customPath

  const searchDirs = [
    join(homedir(), '.locus', 'models'),
    process.cwd(),
    join(process.cwd(), 'models'),
  ]

  let best: { path: string; size: number } | null = null

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue
    try {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.gguf')) continue
        const full = join(dir, f)
        try {
          const size = statSync(full).size
          if (!best || size > best.size) best = { path: full, size }
        } catch { }
      }
    } catch { }
  }

  return best?.path ?? null
}

export function findModels(): { path: string; name: string; sizeBytes: number }[] {
  const results: { path: string; name: string; sizeBytes: number }[] = []
  const dirs = [
    join(homedir(), '.locus', 'models'),
    join(process.cwd(), 'models'),
  ]

  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    try {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.gguf')) continue
        const full = join(dir, f)
        try {
          const stat = statSync(full)
          results.push({ path: full, name: f, sizeBytes: stat.size })
        } catch { }
      }
    } catch { }
  }

  return results.sort((a, b) => b.sizeBytes - a.sizeBytes)
}

export function suggestModelDownload(): string {
  const modelDir = join(homedir(), '.locus', 'models')
  return `Download a GGUF model to ${modelDir}:\n  curl -L -o "${join(modelDir, '<model>.gguf')}" <url>`
}
