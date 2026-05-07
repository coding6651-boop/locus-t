import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export class AuthStorage {
  private dir: string

  constructor(storageDir: string) {
    this.dir = join(storageDir, 'licenses')
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
  }

  save(key: string, data: string): void {
    writeFileSync(join(this.dir, key), data, 'utf-8')
  }

  load(key: string): string | null {
    const path = join(this.dir, key)
    return existsSync(path) ? readFileSync(path, 'utf-8') : null
  }
}
