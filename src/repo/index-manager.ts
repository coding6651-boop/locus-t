import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { RepoIndexer } from './indexer.js'
import { RepoScanner, buildFlatList, type FileNode } from './scanner.js'
import { FileWatcher } from './watcher.js'
import type { IndexProgress, IndexMeta } from './types.js'

const INDEX_DIR = '.locus'
const INDEX_SUBDIR = 'index'
const META_FILE = 'meta.json'

export type IndexStatusKind = 'missing' | 'current' | 'stale'

export interface IndexStatus {
  kind: IndexStatusKind
  meta?: IndexMeta
  fileCount: number
  chunkCount: number
  lastUpdated: string | null
  sizeBytes: number
  watching: boolean
}

export class IndexManager {
  private indexer: RepoIndexer
  private watcher: FileWatcher
  private scanning = false
  private currentFingerprint = ''

  constructor() {
    this.indexer = new RepoIndexer()
    this.watcher = new FileWatcher()
  }

  get repoIndexer(): RepoIndexer {
    return this.indexer
  }

  get isWatching(): boolean {
    return this.watcher.isWatching
  }

  indexDir(rootPath: string): string {
    return join(rootPath, INDEX_DIR, INDEX_SUBDIR)
  }

  status(rootPath: string): IndexStatus {
    const dir = this.indexDir(rootPath)
    const metaPath = join(dir, META_FILE)

    if (!existsSync(metaPath)) {
      return {
        kind: 'missing',
        fileCount: 0,
        chunkCount: 0,
        lastUpdated: null,
        sizeBytes: 0,
        watching: this.watcher.isWatching,
      }
    }

    let meta: IndexMeta
    try {
      meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
    } catch {
      return {
        kind: 'missing',
        fileCount: 0,
        chunkCount: 0,
        lastUpdated: null,
        sizeBytes: 0,
        watching: this.watcher.isWatching,
      }
    }

    const currentFp = this.computeFingerprint(rootPath)
    const kind: IndexStatusKind = meta.fingerprint === currentFp ? 'current' : 'stale'

    return {
      kind,
      meta,
      fileCount: meta.fileCount,
      chunkCount: meta.chunkCount,
      lastUpdated: meta.lastUpdated,
      sizeBytes: meta.sizeBytes,
      watching: this.watcher.isWatching,
    }
  }

  scanFiles(rootPath: string): string[] {
    const scanner = new RepoScanner()
    const result = scanner.scan({ rootPath, maxDepth: 8, maxSizeBytes: 1_048_576 })
    return buildFlatList(result)
  }

  computeFingerprint(rootPath: string): string {
    const scanner = new RepoScanner()
    const result = scanner.scan({ rootPath, maxDepth: 8, maxSizeBytes: 1_048_576 })
    const pairs: string[] = []
    function walk(nodes: FileNode[], prefix: string) {
      for (const n of nodes) {
        const p = prefix ? prefix + '/' + n.name : n.name
        if (n.type === 'dir') walk(n.children ?? [], p)
        else pairs.push(`${p}:${n.size}`)
      }
    }
    walk(result.root.children ?? [], '')
    pairs.sort()
    return createHash('md5').update(pairs.join('|')).digest('hex')
  }

  index(rootPath: string, onProgress?: (p: IndexProgress) => void): { ok: boolean; fileCount: number; chunkCount: number } {
    const fingerprint = this.computeFingerprint(rootPath)
    this.currentFingerprint = fingerprint

    const allFiles = this.scanFiles(rootPath)
    this.indexer.build(allFiles, rootPath, fingerprint, onProgress)

    const dir = this.indexDir(rootPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.indexer.save(dir)

    const indexFilePath = join(dir, `index-${fingerprint}.json`)
    const sizeBytes = existsSync(indexFilePath) ? statSync(indexFilePath).size : 0

    const meta: IndexMeta = {
      fingerprint,
      fileCount: allFiles.length,
      chunkCount: this.indexer.chunkCount,
      lastUpdated: new Date().toISOString(),
      sizeBytes,
    }
    writeFileSync(join(dir, META_FILE), JSON.stringify(meta, null, 2), 'utf-8')

    return { ok: true, fileCount: allFiles.length, chunkCount: meta.chunkCount }
  }

  startWatcher(rootPath: string, onChanged: () => void): void {
    this.watcher.start(rootPath, () => {
      const fp = this.computeFingerprint(rootPath)
      if (fp !== this.currentFingerprint) {
        this.currentFingerprint = fp
        onChanged()
      }
    })
  }

  stopWatcher(): void {
    this.watcher.stop()
  }

  rebuild(rootPath: string, onProgress?: (p: IndexProgress) => void): { ok: boolean; fileCount: number; chunkCount: number } {
    return this.index(rootPath, onProgress)
  }
}
