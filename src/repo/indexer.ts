import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'
import { Chunker } from './chunker.js'
import type {
  IndexChunk,
  ScoredChunk,
  InvertedIndexData,
  IndexProgress,
  ChunkEntryV2,
  TermShardV2,
  ChunkShardV2,
  SymbolShardV2,
  IndexManifestV2,
  SymbolRefV2,
} from './types.js'
import { detectLanguage } from './scanner.js'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'shall', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine',
  'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'get', 'got', 'fix', 'make', 'need', 'want',
  'please', 'help', 'find', 'look', 'show', 'tell', 'use', 'using',
  'like', 'code', 'file', 'function', 'class', 'bug', 'issue', 'error',
])

const MIN_TERM_LENGTH = 2
const MANIFEST_FILE = 'index-manifest.json'

export class RepoIndexer {
  private chunks: IndexChunk[] = []
  private chunkMeta: ChunkEntryV2[] = []
  private chunkLen: number[] = []
  private postings = new Map<string, { chunkIndex: number; tf: number }[]>()
  private terms: string[] = []
  private symbols: SymbolRefV2[] = []
  private fingerprint = ''
  private docCount = 0
  private avgDocLen = 0
  private k1 = 1.2
  private b = 0.75
  private rootPath = process.cwd()

  get isBuilt(): boolean {
    return this.chunkMeta.length > 0
  }

  get chunkCount(): number {
    return this.chunkMeta.length
  }

  get filePaths(): string[] {
    const seen = new Set<string>()
    for (const c of this.chunkMeta) seen.add(c.filePath)
    return [...seen]
  }

  get currentFingerprint(): string {
    return this.fingerprint
  }

  setRootPath(rootPath: string): void {
    this.rootPath = rootPath
  }

  build(files: string[], rootPath: string, fingerprint: string, onProgress?: (p: IndexProgress) => void): void {
    this.rootPath = rootPath
    this.fingerprint = fingerprint
    this.chunks = []
    this.chunkMeta = []
    this.chunkLen = []
    this.postings.clear()
    this.terms = []
    this.symbols = []
    this.docCount = 0
    this.avgDocLen = 0

    const chunker = new Chunker()
    let totalTokens = 0

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi]
      onProgress?.({ current: fi + 1, total: files.length, file })
      const fullPath = join(rootPath, file)
      if (!existsSync(fullPath)) continue

      let content: string
      try {
        content = readFileSync(fullPath, 'utf-8')
      } catch {
        continue
      }

      const lang = detectLanguage(file)
      const fileSymbols = this.extractSymbols(content, file)
      const rawChunks = chunker.chunkByBoundaries(content)

      for (const c of rawChunks) {
        if (c.type === 'boundary' && c.lines.length <= 1) continue
        const chunkContent = c.lines.join('\n')
        const id = `${file}:${c.startLine}`
        const tokens = this.tokenize(chunkContent)
        if (tokens.length === 0) continue

        const normalizedFile = file.replace(/\\/g, '/')
        const chunkIndex = this.chunks.length
        this.chunks.push({
          id,
          filePath: normalizedFile,
          content: chunkContent,
          startLine: c.startLine,
          endLine: c.endLine,
          language: lang,
          label: c.label,
        })

        const pathLower = normalizedFile.toLowerCase()
        this.chunkMeta.push({
          id,
          filePath: normalizedFile,
          startLine: c.startLine,
          endLine: c.endLine,
          language: lang,
          label: c.label,
          docLen: tokens.length,
          pathBoostBase: pathLower.startsWith('src/') ? 0.5 : 0,
        })

        this.chunkLen.push(tokens.length)
        this.docCount++
        totalTokens += tokens.length

        const tfMap = new Map<string, number>()
        for (const token of tokens) tfMap.set(token, (tfMap.get(token) || 0) + 1)
        for (const [term, tf] of tfMap) {
          let list = this.postings.get(term)
          if (!list) {
            list = []
            this.postings.set(term, list)
          }
          list.push({ chunkIndex, tf })
        }

        const inChunkSymbols = fileSymbols.filter((s) => s.startLine >= c.startLine && s.startLine <= c.endLine)
        for (const s of inChunkSymbols) {
          this.symbols.push({ ...s, chunkIndex })
        }
      }
    }

    this.terms = [...this.postings.keys()]
    this.avgDocLen = this.docCount > 0 ? totalTokens / this.docCount : 0
  }

  search(query: string, topK = 6): ScoredChunk[] {
    if (this.chunkMeta.length === 0) return []
    const queryTokens = this.tokenize(query)
    if (queryTokens.length === 0) return []

    const uniqueQueryTerms = [...new Set(queryTokens)]
    const expandedTerms = this.expandQueryTerms(uniqueQueryTerms)
    const candidateChunks = new Set<number>()
    const scoreMap = new Map<number, number>()

    for (const term of expandedTerms) {
      const list = this.postings.get(term)
      if (!list) continue
      const isExpansion = !uniqueQueryTerms.includes(term)
      const idf = this.idf(term)
      const termWeight = isExpansion ? 0.3 : 1
      for (const entry of list) {
        candidateChunks.add(entry.chunkIndex)
        const docLen = this.chunkLen[entry.chunkIndex] || 1
        const avgLen = this.avgDocLen > 0 ? this.avgDocLen : docLen
        const numerator = entry.tf * (this.k1 + 1)
        const denominator = entry.tf + this.k1 * (1 - this.b + this.b * (docLen / avgLen))
        const bm25Term = idf * (numerator / denominator) * termWeight
        scoreMap.set(entry.chunkIndex, (scoreMap.get(entry.chunkIndex) || 0) + bm25Term)
      }
    }

    for (const sym of this.symbols) {
      const symName = sym.name.toLowerCase()
      let symBoost = 0
      for (const qt of uniqueQueryTerms) {
        if (symName === qt) symBoost += 6
        else if (symName.startsWith(qt)) symBoost += 4
        else if (symName.includes(qt)) symBoost += 2
      }
      if (symBoost > 0) {
        candidateChunks.add(sym.chunkIndex)
        scoreMap.set(sym.chunkIndex, (scoreMap.get(sym.chunkIndex) || 0) + symBoost)
      }
    }

    if (candidateChunks.size === 0) return []

    const scored: ScoredChunk[] = []
    for (const chunkIndex of candidateChunks) {
      const score = scoreMap.get(chunkIndex) || 0
      if (score <= 0) continue

      const chunk = this.chunks[chunkIndex] ?? this.chunkMetaToChunk(this.chunkMeta[chunkIndex])
      const pathLower = chunk.filePath.toLowerCase()
      let pathBoost = this.chunkMeta[chunkIndex]?.pathBoostBase ?? 0
      for (const term of uniqueQueryTerms) {
        const fileName = pathLower.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
        if (fileName === term) pathBoost += 5
        else if (fileName.includes(term)) pathBoost += 3
        if (pathLower.includes('/' + term + '/') || pathLower.includes('/' + term + '.') || pathLower.includes('/' + term + '-')) pathBoost += 2
      }
      scored.push({ chunk, score: score + pathBoost })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  }

  save(cacheDir: string): void {
    if (this.chunkMeta.length === 0) return
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })

    const termsShard: TermShardV2 = {
      version: 2,
      fingerprint: this.fingerprint,
      postings: Object.fromEntries(this.postings),
    }
    const chunksShard: ChunkShardV2 = {
      version: 2,
      fingerprint: this.fingerprint,
      chunks: this.chunkMeta,
    }
    const symbolsShard: SymbolShardV2 = {
      version: 2,
      fingerprint: this.fingerprint,
      symbols: this.symbols,
    }

    const termsFile = `terms-${this.fingerprint}.json.gz`
    const chunksFile = `chunks-${this.fingerprint}.json.gz`
    const symbolsFile = `symbols-${this.fingerprint}.json.gz`

    this.writeCompressedJson(join(cacheDir, termsFile), termsShard)
    this.writeCompressedJson(join(cacheDir, chunksFile), chunksShard)
    this.writeCompressedJson(join(cacheDir, symbolsFile), symbolsShard)

    const termsPath = join(cacheDir, termsFile)
    const chunksPath = join(cacheDir, chunksFile)
    const symbolsPath = join(cacheDir, symbolsFile)
    const manifest: IndexManifestV2 = {
      version: 2,
      fingerprint: this.fingerprint,
      createdAt: new Date().toISOString(),
      totalChunks: this.chunkMeta.length,
      fileCount: this.filePaths.length,
      docCount: this.docCount,
      avgDocLen: this.avgDocLen,
      schema: 'manifest-shards-v2',
      shards: {
        terms: {
          file: termsFile,
          checksum: this.checksumFile(termsPath),
          sizeBytes: statSync(termsPath).size,
        },
        chunks: {
          file: chunksFile,
          checksum: this.checksumFile(chunksPath),
          sizeBytes: statSync(chunksPath).size,
        },
        symbols: {
          file: symbolsFile,
          checksum: this.checksumFile(symbolsPath),
          sizeBytes: statSync(symbolsPath).size,
        },
      },
    }

    writeFileSync(join(cacheDir, MANIFEST_FILE), JSON.stringify(manifest), 'utf-8')
  }

  load(cacheDir: string, fingerprint: string): boolean {
    this.rootPath = this.rootPath || process.cwd()
    const manifestPath = join(cacheDir, MANIFEST_FILE)
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as IndexManifestV2
        if (manifest.version !== 2 || manifest.fingerprint !== fingerprint) return false
        const termsPath = join(cacheDir, manifest.shards.terms.file)
        const chunksPath = join(cacheDir, manifest.shards.chunks.file)
        const symbolsPath = join(cacheDir, manifest.shards.symbols.file)
        if (!existsSync(termsPath) || !existsSync(chunksPath) || !existsSync(symbolsPath)) return false

        if (this.checksumFile(termsPath) !== manifest.shards.terms.checksum) return false
        if (this.checksumFile(chunksPath) !== manifest.shards.chunks.checksum) return false
        if (this.checksumFile(symbolsPath) !== manifest.shards.symbols.checksum) return false

        const terms = this.readCompressedJson<TermShardV2>(termsPath)
        const chunks = this.readCompressedJson<ChunkShardV2>(chunksPath)
        const symbols = this.readCompressedJson<SymbolShardV2>(symbolsPath)
        if (terms.fingerprint !== fingerprint || chunks.fingerprint !== fingerprint || symbols.fingerprint !== fingerprint) return false

        this.fingerprint = fingerprint
        this.chunkMeta = chunks.chunks
        this.chunks = chunks.chunks.map((c) => this.chunkMetaToChunk(c))
        this.chunkLen = chunks.chunks.map((c) => c.docLen)
        this.docCount = manifest.docCount
        this.avgDocLen = manifest.avgDocLen
        this.symbols = symbols.symbols
        this.postings.clear()
        for (const [term, list] of Object.entries(terms.postings)) this.postings.set(term, list)
        this.terms = [...this.postings.keys()]
        return true
      } catch {
        return false
      }
    }

    return this.loadV1(cacheDir, fingerprint)
  }

  private loadV1(cacheDir: string, fingerprint: string): boolean {
    const filePath = join(cacheDir, `index-${fingerprint}.json`)
    if (!existsSync(filePath)) return false

    try {
      const raw = readFileSync(filePath, 'utf-8')
      const data: InvertedIndexData = JSON.parse(raw)
      if (data.fingerprint !== fingerprint) return false

      this.fingerprint = data.fingerprint
      this.chunks = data.chunks
      this.chunkMeta = data.chunks.map((c) => ({
        id: c.id,
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
        language: c.language,
        label: c.label,
        docLen: this.tokenize(c.content ?? '').length,
        pathBoostBase: c.filePath.toLowerCase().startsWith('src/') ? 0.5 : 0,
      }))
      this.chunkLen = this.chunkMeta.map((c) => c.docLen)
      this.docCount = data.docCount
      this.avgDocLen = data.avgDocLen
      this.postings.clear()
      for (const [term, list] of Object.entries(data.postings)) this.postings.set(term, list)
      this.terms = [...this.postings.keys()]
      this.symbols = []
      return true
    } catch {
      return false
    }
  }

  private writeCompressedJson(path: string, data: object): void {
    const gz = gzipSync(Buffer.from(JSON.stringify(data), 'utf-8'))
    writeFileSync(path, gz)
  }

  private readCompressedJson<T>(path: string): T {
    const raw = readFileSync(path)
    return JSON.parse(gunzipSync(raw).toString('utf-8')) as T
  }

  private checksumFile(path: string): string {
    const raw = readFileSync(path)
    return createHash('sha1').update(raw).digest('hex')
  }

  private chunkMetaToChunk(meta: ChunkEntryV2): IndexChunk {
    return {
      id: meta.id,
      filePath: meta.filePath,
      startLine: meta.startLine,
      endLine: meta.endLine,
      language: meta.language,
      label: meta.label,
    }
  }

  private tokenize(text: string): string[] {
    const tokens = text.toLowerCase().split(/[^a-zA-Z0-9_#.]+/).filter(Boolean)
    return tokens.filter((t) => t.length >= MIN_TERM_LENGTH && !STOP_WORDS.has(t))
  }

  private expandQueryTerms(queryTerms: string[]): string[] {
    const expanded = new Set<string>()
    for (const qt of queryTerms) {
      expanded.add(qt)
      const prefixLen = Math.max(4, Math.ceil(qt.length * 0.6))
      const qtPrefix = qt.slice(0, prefixLen)
      if (qtPrefix.length < 4) continue
      for (const term of this.terms) {
        if (term.startsWith(qtPrefix) && term !== qt) expanded.add(term)
      }
    }
    return [...expanded]
  }

  private idf(term: string): number {
    const list = this.postings.get(term)
    if (!list || this.docCount === 0) return 0
    return Math.log(1 + (this.docCount - list.length + 0.5) / (list.length + 0.5))
  }

  private extractSymbols(content: string, filePath: string): Omit<SymbolRefV2, 'chunkIndex'>[] {
    const out: Omit<SymbolRefV2, 'chunkIndex'>[] = []
    const lines = content.split('\n')
    const patterns: { kind: SymbolRefV2['kind']; re: RegExp }[] = [
      { kind: 'function', re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)/ },
      { kind: 'class', re: /^\s*(?:export\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'interface', re: /^\s*(?:export\s+)?interface\s+([A-Za-z_][\w]*)/ },
      { kind: 'type', re: /^\s*(?:export\s+)?type\s+([A-Za-z_][\w]*)\s*=/ },
      { kind: 'enum', re: /^\s*(?:export\s+)?enum\s+([A-Za-z_][\w]*)/ },
      { kind: 'const', re: /^\s*(?:export\s+)?const\s+([A-Za-z_][\w]*)\s*=/ },
      { kind: 'method', re: /^\s*(?:public|private|protected)?\s*(?:async\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{/ },
    ]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const p of patterns) {
        const m = line.match(p.re)
        if (!m) continue
        const name = m[1]
        const signature = line.trim().slice(0, 220)
        const docPreview = i > 0 && lines[i - 1].trim().startsWith('//') ? lines[i - 1].trim().slice(0, 200) : undefined
        out.push({
          name,
          kind: p.kind,
          signature,
          filePath: filePath.replace(/\\/g, '/'),
          startLine: i + 1,
          endLine: i + 1,
          docPreview,
        })
        break
      }
    }

    return out
  }
}
