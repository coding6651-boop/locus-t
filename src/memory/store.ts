import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { Session } from '../core/session.js'

export class SessionStore {
  private dir: string

  constructor(storageDir: string) {
    this.dir = join(storageDir, 'sessions')
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
  }

  save(session: Session): void {
    const data = JSON.stringify(session, null, 2)
    writeFileSync(join(this.dir, `${session.id}.json`), data, 'utf-8')
  }

  load(id: string): Session | null {
    const path = join(this.dir, `${id}.json`)
    if (!existsSync(path)) return null
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw)
  }

  list(): { id: string; createdAt: string; turns: number }[] {
    if (!existsSync(this.dir)) return []
    return readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          const raw = readFileSync(join(this.dir, f), 'utf-8')
          const s = JSON.parse(raw)
          return { id: s.id, createdAt: s.createdAt, turns: s.turns ?? 0 }
        } catch {
          return null
        }
      })
      .filter((s): s is { id: string; createdAt: string; turns: number } => s !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  delete(id: string): boolean {
    const path = join(this.dir, `${id}.json`)
    if (!existsSync(path)) return false
    unlinkSync(path)
    return true
  }

  last(): Session | null {
    const sessions = this.list()
    if (sessions.length === 0) return null
    return this.load(sessions[0].id)
  }
}
