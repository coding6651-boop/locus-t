import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export class SummaryStore {
  private dir: string

  constructor(storageDir: string) {
    this.dir = join(storageDir, 'memory')
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
  }

  save(sessionId: string, summary: string): void {
    writeFileSync(join(this.dir, `${sessionId}.summary`), summary, 'utf-8')
  }

  load(sessionId: string): string | null {
    const path = join(this.dir, `${sessionId}.summary`)
    return existsSync(path) ? readFileSync(path, 'utf-8') : null
  }
}
