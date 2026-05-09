import pc from 'picocolors'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { runtimeDir, runtimeBinaryPath, runtimeVersionPath } from './paths.js'
import type { RuntimeManifest, PlatformEntry } from './types.js'

export type DownloadProgress = (phase: string, fraction: number) => void

export async function installFromSource(sourceBinary: string): Promise<boolean> {
  const target = runtimeBinaryPath()
  const dir = runtimeDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  try {
    const data = readFileSync(sourceBinary)
    writeFileSync(target, data)
    writeFileSync(runtimeVersionPath(), 'copied\n')

    const sourceDir = sourceBinary.replace(/[/\\][^/\\]+$/, '')
    for (const f of readdirSync(sourceDir)) {
      if (f.endsWith('.dll') && !existsSync(join(dir, f))) {
        try { copyFileSync(join(sourceDir, f), join(dir, f)) } catch { }
      }
    }

    return existsSync(target)
  } catch {
    return false
  }
}

export async function downloadRuntime(
  manifest: RuntimeManifest,
  onProgress?: DownloadProgress,
): Promise<boolean> {
  const dir = runtimeDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const platform = resolvePlatform(manifest)
  if (!platform) {
    onProgress?.('error', 0)
    return false
  }

  const zipPath = join(tmpdir(), `locus-runtime-${manifest.version}.zip`)

  try {
    onProgress?.('connecting', 0)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120_000)
    const res = await fetch(platform.zipUrl, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) {
      onProgress?.('error', 0)
      return false
    }

    const total = Number(res.headers.get('content-length') ?? 0)
    const reader = res.body!.getReader()
    const hash = createHash('sha256')
    const chunks: Buffer[] = []
    let received = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
      received += value.length
      hash.update(value)
      onProgress?.('download', total ? received / total : 0)
    }

    onProgress?.('verify', 1)
    const body = Buffer.concat(chunks)
    const actualHash = hash.digest('hex')

    if (platform.sha256 !== 'PLACEHOLDER_CHECKSUM_REPLACE_ME' && actualHash !== platform.sha256) {
      return false
    }

    onProgress?.('extract', 0)
    writeFileSync(zipPath, body)
    extractZip(zipPath, dir)

    for (const file of platform.files) {
      const srcName = file.name
      const dstName = file.rename || file.name
      const srcPath = join(dir, srcName)
      const dstPath = join(dir, dstName)
      if (existsSync(srcPath)) {
        if (srcName !== dstName) {
          renameSync(srcPath, dstPath)
        }
      }
    }

    writeFileSync(runtimeVersionPath(), `${manifest.version}\n`)
    onProgress?.('done', 1)
    return true
  } catch (err: any) {
    if (err.name === 'AbortError') {
      onProgress?.('timeout', 0)
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      onProgress?.('offline', 0)
    } else {
      onProgress?.('error', 0)
    }
    return false
  }
}

function extractZip(zipPath: string, destDir: string): void {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      { stdio: 'ignore', timeout: 30000, windowsHide: true },
    )
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'ignore', timeout: 30000 })
  }
}

function resolvePlatform(manifest: RuntimeManifest): PlatformEntry | null {
  const os = process.platform
  const arch = process.arch

  const candidates = manifest.platforms.filter((p) => p.os === os && p.arch === arch)
  if (candidates.length === 0) return null

  if (os === 'win32' && arch === 'x64') {
    const avx2 = candidates.find((p) => p.variant === 'avx2')
    if (avx2) return avx2
  }

  return candidates[0]
}

export function isRuntimeInstalled(): boolean {
  return existsSync(runtimeBinaryPath())
}
