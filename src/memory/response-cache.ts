import { createHash } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface CacheEntry {
  query: string
  fingerprint: string
  response: string
  createdAt: string
  hits: number
}

const CACHE_DIR = join(homedir(), '.locus', 'cache')
const TTL_MS = 30 * 24 * 60 * 60 * 1000

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

function makeKey(normalizedQuery: string, fingerprint: string): string {
  return createHash('sha256')
    .update(normalizedQuery + '|' + fingerprint)
    .digest('hex')
    .slice(0, 16)
}

export class ResponseCache {
  get(query: string, fingerprint: string): string | null {
    if (!fingerprint) return null

    const key = makeKey(normalizeQuery(query), fingerprint)
    const path = join(CACHE_DIR, `${key}.json`)
    if (!existsSync(path)) return null

    try {
      const raw = readFileSync(path, 'utf-8')
      const entry: CacheEntry = JSON.parse(raw)

      const age = Date.now() - new Date(entry.createdAt).getTime()
      if (age > TTL_MS) {
        try { unlinkSync(path) } catch { }
        return null
      }

      entry.hits++
      writeFileSync(path, JSON.stringify(entry, null, 2), 'utf-8')

      return entry.response
    } catch {
      return null
    }
  }

  set(query: string, fingerprint: string, response: string): void {
    if (!fingerprint || !response) return

    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }

    const key = makeKey(normalizeQuery(query), fingerprint)
    const path = join(CACHE_DIR, `${key}.json`)

    const entry: CacheEntry = {
      query: normalizeQuery(query),
      fingerprint,
      response,
      createdAt: new Date().toISOString(),
      hits: 1,
    }

    writeFileSync(path, JSON.stringify(entry, null, 2), 'utf-8')
  }
}
