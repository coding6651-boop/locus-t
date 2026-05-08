import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'

export const LICENSE_FILE_NAME = 'license.lic'

export function licenseDir(): string {
  return join(homedir(), '.locus')
}

export function licensePath(): string {
  return join(licenseDir(), LICENSE_FILE_NAME)
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function read(): string | null {
  const path = licensePath()
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf-8')
}

export function write(value: string): void {
  const path = licensePath()
  ensureDir(dirname(path))

  const tmp = join(tmpdir(), `.license_${randomBytes(4).toString('hex')}_${Date.now()}.tmp`)
  writeFileSync(tmp, value, 'utf-8')
  renameSync(tmp, path)
}

export function remove(): boolean {
  const path = licensePath()
  if (!existsSync(path)) return false
  unlinkSync(path)
  return true
}
