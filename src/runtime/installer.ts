import pc from 'picocolors'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { runtimeDir, runtimeBinaryPath, runtimeVersionPath } from './paths.js'
import type { RuntimeManifest, PlatformEntry } from './types.js'

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

export async function downloadRuntime(manifest: RuntimeManifest): Promise<boolean> {
  const dir = runtimeDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const platform = resolvePlatform(manifest)
  if (!platform) {
    process.stdout.write(pc.red(`  No runtime available for ${process.platform} ${process.arch}\n`))
    return false
  }

  process.stdout.write(`  Downloading runtime (${platform.variant})...\n  ${platform.zipUrl}\n`)

  const zipPath = join(tmpdir(), `locus-runtime-${manifest.version}.zip`)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120_000)
    const res = await fetch(platform.zipUrl, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) {
      process.stdout.write(pc.yellow(`  Download failed: HTTP ${res.status}\n`))
      return false
    }

    const body = Buffer.from(await res.arrayBuffer())
    process.stdout.write('  Downloaded ✓\n')

    const actualHash = createHash('sha256').update(body).digest('hex')
    if (platform.sha256 !== 'PLACEHOLDER_CHECKSUM_REPLACE_ME' && actualHash !== platform.sha256) {
      process.stdout.write(pc.red(`  SHA256 mismatch:\n    expected: ${platform.sha256}\n    actual:   ${actualHash}\n`))
      return false
    }

    writeFileSync(zipPath, body)

    process.stdout.write('  Extracting... ')
    extractZip(zipPath, dir)
    process.stdout.write(pc.green('✓\n'))

    for (const file of platform.files) {
      const srcName = file.name
      const dstName = file.rename || file.name
      const srcPath = join(dir, srcName)
      const dstPath = join(dir, dstName)
      if (existsSync(srcPath)) {
        if (srcName !== dstName) {
          renameSync(srcPath, dstPath)
        }
      } else if (!file.optional) {
        process.stdout.write(`  (${srcName} not found, may be optional)\n`)
      }
    }

    writeFileSync(runtimeVersionPath(), `${manifest.version}\n`)
    return true
  } catch (err: any) {
    if (err.name === 'AbortError') {
      process.stdout.write(pc.yellow('  Download timed out (120s). Check your internet connection.\n'))
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      process.stdout.write(pc.yellow('  Cannot reach GitHub. No internet connection.\n'))
      process.stdout.write(`  ${pc.dim('To install manually, download from:')}\n`)
      process.stdout.write(`    ${platform.zipUrl}\n`)
      process.stdout.write(`  ${pc.dim('and extract to: ')}${dir}\n`)
    } else {
      process.stdout.write(pc.yellow(`  Download failed: ${err.message}\n`))
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
