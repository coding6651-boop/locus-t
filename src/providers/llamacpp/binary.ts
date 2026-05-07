import type { LLMConfig } from '../types.js'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const BINARY_NAMES = process.platform === 'win32'
  ? ['llama-server.exe', 'llama-server']
  : ['llama-server', 'llama-server-main']

const SEARCH_PATHS = [
  process.cwd(),
  join(homedir(), '.locus', 'bin'),
  join(homedir(), '.local', 'bin'),
  '/usr/local/bin',
  '/usr/bin',
]

export function findBinary(customPath?: string): string | null {
  if (customPath) {
    if (existsSync(customPath)) return customPath
  }

  const pathEnv = process.env.PATH?.split(';').map(p => p.trim()) ?? []

  for (const name of BINARY_NAMES) {
    for (const dir of [...SEARCH_PATHS, ...pathEnv]) {
      const full = join(dir, name)
      try {
        if (existsSync(full) && statSync(full).isFile()) return full
      } catch { continue }
    }

    try {
      execSync(`${name} --version 2>${process.platform === 'win32' ? 'nul' : '/dev/null'}`, { stdio: 'ignore' })
      return name
    } catch { continue }
  }

  return null
}

export function findModel(customPath?: string): string | null {
  if (customPath) {
    if (existsSync(customPath)) return customPath
  }

  const searchDirs = [
    join(homedir(), '.locus', 'models'),
    process.cwd(),
    join(process.cwd(), 'models'),
  ]

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue
    try {
      const files = execSync(`dir "${dir}\\*.gguf" /b 2>nul`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean)
      if (files.length > 0) return join(dir, files[0])
    } catch {
      try {
        const files = execSync(`ls "${dir}"/*.gguf 2>/dev/null`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
          .split('\n')
          .map(f => f.trim())
          .filter(Boolean)
        if (files.length > 0) return files[0]
      } catch { continue }
    }
  }

  return null
}

export function suggestModelDownload(): string {
  const modelDir = join(homedir(), '.locus', 'models')
  return `Download a GGUF model to ${modelDir}:\n  curl -L -o "${join(modelDir, 'qwen2.5-coder-1.5b-instruct.gguf')}" <url>`
}
