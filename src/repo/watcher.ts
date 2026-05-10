import { watch, type FSWatcher } from 'fs'
import { relative } from 'path'

const IGNORE_PATTERNS = [
  /[/\\]node_modules[/\\]/,
  /[/\\]\.git[/\\]/,
  /[/\\]dist[/\\]/,
  /[/\\]\.locus[/\\]/,
  /[/\\]__pycache__[/\\]/,
  /[/\\]\.next[/\\]/,
  /[/\\]\.turbo[/\\]/,
  /[/\\]coverage[/\\]/,
  /\.env$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
]

export interface WatchEvent {
  type: 'change' | 'rename'
  file: string
}

export class FileWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private onChange: ((events: WatchEvent[]) => void) | null = null
  private debounceMs: number
  private pending: WatchEvent[] = []

  constructor(debounceMs = 1000) {
    this.debounceMs = debounceMs
  }

  get isWatching(): boolean {
    return this.watcher !== null
  }

  start(rootPath: string, onChange: (events: WatchEvent[]) => void): void {
    if (this.watcher) this.stop()
    this.onChange = onChange
    this.pending = []

    try {
      this.watcher = watch(rootPath, { recursive: true })
      this.watcher.on('change', (eventType, filename) => {
        if (!filename) return
        const relativePath = relative(rootPath, filename.toString()).replace(/\\/g, '/')
        if (this.shouldIgnore(relativePath)) return
        this.queue({ type: eventType as WatchEvent['type'], file: relativePath })
      })
      this.watcher.on('error', () => {})
    } catch {
      this.watcher = null
    }
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.watcher) {
      try { this.watcher.close() } catch {}
      this.watcher = null
    }
    this.pending = []
    this.onChange = null
  }

  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.fire()
  }

  private queue(event: WatchEvent): void {
    this.pending.push(event)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.fire(), this.debounceMs)
  }

  private fire(): void {
    if (this.pending.length === 0) return
    const events = this.pending.splice(0)
    this.onChange?.(events)
  }

  private shouldIgnore(filePath: string): boolean {
    for (const p of IGNORE_PATTERNS) {
      if (p.test(filePath)) return true
    }
    return false
  }
}
