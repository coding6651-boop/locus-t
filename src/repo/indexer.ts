import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs'
import { join, relative, extname } from 'path'
import { createHash } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'
import * as ts from 'typescript'
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
  DepGraphShardV2,
  XRefShardV2,
  XRefEntry,
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
  'very', 'just',
])

const MIN_TERM_LENGTH = 2
const MANIFEST_FILE = 'index-manifest.json'

const C_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

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
  private depForward = new Map<string, string[]>()
  private depReverse = new Map<string, string[]>()
  private xrefs = new Map<string, XRefEntry[]>()

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
    this.depForward.clear()
    this.depReverse.clear()
    this.xrefs.clear()

    const chunker = new Chunker()
    let totalTokens = 0
    const allFileImports: { file: string; sources: string[] }[] = []

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
      const ext = extname(file).toLowerCase()

      let fileSymbols: Omit<SymbolRefV2, 'chunkIndex'>[]
      let fileImports: { source: string; startLine: number; endLine: number }[]
      let fileExports: { name: string; startLine: number; endLine: number }[]

      if (C_EXTENSIONS.has(ext)) {
        const parsed = this.parseWithAST(content, file)
        fileSymbols = parsed.symbols
        fileImports = parsed.imports
        fileExports = parsed.exports
      } else {
        fileSymbols = this.extractSymbols(content, file)
        fileImports = this.extractFileImports(content)
        fileExports = this.extractFileExports(content)
      }

      allFileImports.push({ file, sources: fileImports.map(i => i.source) })

      const rawChunks = chunker.chunkByBoundaries(content)

      for (const c of rawChunks) {
        if (c.type === 'boundary' && c.lines.length <= 1) continue
        const chunkContent = c.lines.join('\n')
        const id = `${file}:${c.startLine}`
        const tokens = this.tokenize(chunkContent)
        if (tokens.length === 0) continue

        const chunkImportSources = fileImports
          .filter(imp => imp.startLine >= c.startLine && imp.startLine <= c.endLine)
          .map(imp => imp.source)
        const chunkExportNames = fileExports
          .filter(exp => exp.startLine >= c.startLine && exp.startLine <= c.endLine)
          .map(exp => exp.name)
        const chunkKeywords = this.extractChunkKeywords(chunkContent, chunkImportSources)

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
          imports: chunkImportSources.length > 0 ? chunkImportSources : undefined,
          exportNames: chunkExportNames.length > 0 ? chunkExportNames : undefined,
          keywords: chunkKeywords.length > 0 ? chunkKeywords : undefined,
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
          imports: chunkImportSources.length > 0 ? chunkImportSources : undefined,
          exportNames: chunkExportNames.length > 0 ? chunkExportNames : undefined,
          keywords: chunkKeywords.length > 0 ? chunkKeywords : undefined,
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

    this.buildDependencyGraph(files, allFileImports)
    this.buildCrossReferences()
  }

  search(query: string, topK = 15): ScoredChunk[] {
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
      if (sym.exported) {
        const symLower = sym.name.toLowerCase()
        for (const qt of uniqueQueryTerms) {
          if (symLower === qt) scoreMap.set(sym.chunkIndex, (scoreMap.get(sym.chunkIndex) || 0) + 3)
        }
      }
    }

    for (const ci of candidateChunks) {
      const meta = this.chunkMeta[ci]
      if (!meta) continue
      let metaBoost = 0
      const impNames = meta.imports?.map(s => s.split('/').pop()?.replace(/\.[^.]+$/, '')?.toLowerCase() ?? '') ?? []
      const expNames = meta.exportNames?.map(s => s.toLowerCase()) ?? []
      const keywords = meta.keywords ?? []

      for (const qt of uniqueQueryTerms) {
        if (impNames.some(n => n === qt)) metaBoost += 5
        else if (impNames.some(n => n.includes(qt))) metaBoost += 3
        if (expNames.some(n => n === qt)) metaBoost += 5
        else if (expNames.some(n => n.includes(qt))) metaBoost += 3
        if (keywords.some(k => k.includes(qt) || qt.includes(k))) metaBoost += 3
      }

      if (metaBoost > 0) {
        scoreMap.set(ci, (scoreMap.get(ci) || 0) + metaBoost)
      }
    }

    const fileHubBoost = this.computeFileHubBoost(candidateChunks)

    if (candidateChunks.size === 0) return []

    const scored: ScoredChunk[] = []
    for (const chunkIndex of candidateChunks) {
      const score = scoreMap.get(chunkIndex) || 0
      if (score <= 0) continue

      const meta = this.chunkMeta[chunkIndex]
      const chunk = this.chunks[chunkIndex] ?? this.chunkMetaToChunk(meta)
      const pathLower = chunk.filePath.toLowerCase()
      let pathBoost = meta?.pathBoostBase ?? 0
      for (const term of uniqueQueryTerms) {
        const fileName = pathLower.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
        if (fileName === term) pathBoost += 5
        else if (fileName.includes(term)) pathBoost += 3
        if (pathLower.includes('/' + term + '/') || pathLower.includes('/' + term + '.') || pathLower.includes('/' + term + '-')) pathBoost += 2
      }

      const depBoost = fileHubBoost.get(chunk.filePath) ?? 0
      const xrefBoost = this.computeXRefBoost(chunk.filePath, uniqueQueryTerms)

      scored.push({ chunk, score: score + pathBoost + depBoost + xrefBoost })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  }

  private computeFileHubBoost(candidateChunks: Set<number>): Map<string, number> {
    const boost = new Map<string, number>()
    const visited = new Set<string>()

    for (const ci of candidateChunks) {
      const meta = this.chunkMeta[ci]
      if (!meta) continue
      const fp = meta.filePath
      if (visited.has(fp)) continue
      visited.add(fp)

      const dependents = this.depReverse.get(fp)
      if (dependents) {
        for (const dep of dependents) {
          const current = boost.get(dep) ?? 0
          boost.set(dep, Math.max(current, 8))
        }
      }

      const dependencies = this.depForward.get(fp)
      if (dependencies) {
        for (const dep of dependencies) {
          const current = boost.get(dep) ?? 0
          boost.set(dep, Math.max(current, 4))
        }
      }
    }

    return boost
  }

  private computeXRefBoost(filePath: string, queryTerms: string[]): number {
    let boost = 0
    for (const qt of queryTerms) {
      const refs = this.xrefs.get(qt)
      if (!refs) continue
      for (const ref of refs) {
        if (ref.filePath === filePath) {
          boost += 4
          break
        }
      }
    }
    return boost
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

    const depsShard: DepGraphShardV2 = {
      version: 2,
      fingerprint: this.fingerprint,
      forward: Object.fromEntries(this.depForward),
      reverse: Object.fromEntries(this.depReverse),
    }

    const xrefsShard: XRefShardV2 = {
      version: 2,
      fingerprint: this.fingerprint,
      refs: Object.fromEntries(this.xrefs),
    }

    const termsFile = `terms-${this.fingerprint}.json.gz`
    const chunksFile = `chunks-${this.fingerprint}.json.gz`
    const symbolsFile = `symbols-${this.fingerprint}.json.gz`
    const depsFile = `deps-${this.fingerprint}.json.gz`
    const xrefsFile = `xrefs-${this.fingerprint}.json.gz`

    this.writeCompressedJson(join(cacheDir, termsFile), termsShard)
    this.writeCompressedJson(join(cacheDir, chunksFile), chunksShard)
    this.writeCompressedJson(join(cacheDir, symbolsFile), symbolsShard)
    this.writeCompressedJson(join(cacheDir, depsFile), depsShard)
    this.writeCompressedJson(join(cacheDir, xrefsFile), xrefsShard)

    const termsPath = join(cacheDir, termsFile)
    const chunksPath = join(cacheDir, chunksFile)
    const symbolsPath = join(cacheDir, symbolsFile)
    const depsPath = join(cacheDir, depsFile)
    const xrefsPath = join(cacheDir, xrefsFile)

    function shardMeta(file: string, path: string): { file: string; checksum: string; sizeBytes: number } {
      return {
        file,
        checksum: createHash('sha1').update(readFileSync(path)).digest('hex'),
        sizeBytes: statSync(path).size,
      }
    }

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
        terms: shardMeta(termsFile, termsPath),
        chunks: shardMeta(chunksFile, chunksPath),
        symbols: shardMeta(symbolsFile, symbolsPath),
        deps: shardMeta(depsFile, depsPath),
        xrefs: shardMeta(xrefsFile, xrefsPath),
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

        const shard = manifest.shards
        const termsPath = join(cacheDir, shard.terms.file)
        const chunksPath = join(cacheDir, shard.chunks.file)
        const symbolsPath = join(cacheDir, shard.symbols.file)
        if (!existsSync(termsPath) || !existsSync(chunksPath) || !existsSync(symbolsPath)) return false

        if (this.checksumFile(termsPath) !== shard.terms.checksum) return false
        if (this.checksumFile(chunksPath) !== shard.chunks.checksum) return false
        if (this.checksumFile(symbolsPath) !== shard.symbols.checksum) return false

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
        this.depForward.clear()
        this.depReverse.clear()
        this.xrefs.clear()

        if (shard.deps) {
          const depsPath = join(cacheDir, shard.deps.file)
          if (existsSync(depsPath)) {
            try {
              const deps = this.readCompressedJson<DepGraphShardV2>(depsPath)
              if (deps.fingerprint === fingerprint) {
                for (const [k, v] of Object.entries(deps.forward)) this.depForward.set(k, v)
                for (const [k, v] of Object.entries(deps.reverse)) this.depReverse.set(k, v)
              }
            } catch {}
          }
        }

        if (shard.xrefs) {
          const xrefsPath = join(cacheDir, shard.xrefs.file)
          if (existsSync(xrefsPath)) {
            try {
              const xrefs = this.readCompressedJson<XRefShardV2>(xrefsPath)
              if (xrefs.fingerprint === fingerprint) {
                for (const [k, v] of Object.entries(xrefs.refs)) this.xrefs.set(k, v)
              }
            } catch {}
          }
        }

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
      this.depForward.clear()
      this.depReverse.clear()
      this.xrefs.clear()
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
      imports: meta.imports,
      exportNames: meta.exportNames,
      keywords: meta.keywords,
    }
  }

  private buildDependencyGraph(
    files: string[],
    allFileImports: { file: string; sources: string[] }[],
  ): void {
    const fileSet = new Set(files.map(f => f.replace(/\\/g, '/')))

    for (const { file, sources } of allFileImports) {
      const normalizedFile = file.replace(/\\/g, '/')
      const resolvedDeps: string[] = []

      for (const source of sources) {
        if (!source.startsWith('.') && !source.startsWith('/')) continue

        const baseDir = normalizedFile.split('/').slice(0, -1).join('/')
        const resolved = this.resolveModulePath(baseDir, source)
        if (resolved && fileSet.has(resolved)) {
          resolvedDeps.push(resolved)
        }
      }

      if (resolvedDeps.length > 0) {
        this.depForward.set(normalizedFile, resolvedDeps)
        for (const dep of resolvedDeps) {
          const existing = this.depReverse.get(dep) ?? []
          existing.push(normalizedFile)
          this.depReverse.set(dep, existing)
        }
      }
    }
  }

  private resolveModulePath(baseDir: string, specifier: string): string | null {
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '']
    const base = specifier.startsWith('/')
      ? specifier.slice(1)
      : baseDir ? baseDir + '/' + specifier : specifier

    for (const ext of exts) {
      const p = base + ext
      if (existsSync(join(this.rootPath, p))) return p.replace(/\\/g, '/')
    }

    const indexBase = base + '/index'
    for (const ext of exts) {
      if (ext) {
        const p = indexBase + ext
        if (existsSync(join(this.rootPath, p))) return p.replace(/\\/g, '/')
      }
    }

    return null
  }

  private buildCrossReferences(): void {
    const allNames = new Map<string, Set<string>>()

    for (const sym of this.symbols) {
      const fp = sym.filePath
      if (!allNames.has(fp)) allNames.set(fp, new Set())
      allNames.get(fp)!.add(sym.name.toLowerCase())
    }

    for (let ci = 0; ci < this.chunks.length; ci++) {
      const meta = this.chunkMeta[ci]
      if (!meta) continue
      const content = this.chunks[ci]?.content
      if (!content) continue

      const definingFile = meta.filePath
      const lowerContent = content.toLowerCase()

      for (const [filePath, names] of allNames) {
        if (filePath === definingFile) continue
        for (const name of names) {
          if (name.length < 3) continue
          const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b')
          if (re.test(lowerContent)) {
            const lineIdx = content.split('\n').findIndex(l => l.toLowerCase().includes(name))
            const entry: XRefEntry = {
              filePath: definingFile,
              chunkIndex: ci,
              line: lineIdx >= 0 ? lineIdx + 1 : meta.startLine,
            }
            const existing = this.xrefs.get(name) ?? []
            existing.push(entry)
            this.xrefs.set(name, existing)
          }
        }
      }
    }
  }

  private parseWithAST(content: string, filePath: string): {
    symbols: Omit<SymbolRefV2, 'chunkIndex'>[]
    imports: { source: string; startLine: number; endLine: number }[]
    exports: { name: string; startLine: number; endLine: number }[]
  } {
    const symbols: Omit<SymbolRefV2, 'chunkIndex'>[] = []
    const imports: { source: string; startLine: number; endLine: number }[] = []
    const exports: { name: string; startLine: number; endLine: number }[] = []

    let sourceFile: ts.SourceFile
    try {
      sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
    } catch {
      const regexResult = this.extractSymbols(content, filePath)
      const regexImports = this.extractFileImports(content)
      const regexExports = this.extractFileExports(content)
      return { symbols: regexResult, imports: regexImports, exports: regexExports }
    }

    const getDocPreview = (node: ts.Node): string | undefined => {
      const leading = ts.getLeadingCommentRanges(content, node.getFullStart())
      if (leading && leading.length > 0) {
        const last = leading[leading.length - 1]
        return content.slice(last.pos, last.end).trim().slice(0, 200)
      }
      return undefined
    }

    const hasExportModifier = (node: ts.Node): boolean => {
      return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0
    }

    const addSymbol = (
      name: string,
      kind: SymbolRefV2['kind'],
      node: ts.Node,
      exported: boolean,
    ) => {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
      const sig = content.slice(node.getStart(), node.getStart() + Math.min(220, node.getWidth())).trim()
      const dp = getDocPreview(node)
      symbols.push({
        name,
        kind,
        signature: sig,
        filePath: filePath.replace(/\\/g, '/'),
        startLine: line,
        endLine: line + content.slice(node.getStart(), node.getEnd()).split('\n').length - 1,
        docPreview: dp,
        exported,
      })
    }

    function visit(node: ts.Node): void {
      if (ts.isFunctionDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'function', node, hasExportModifier(node))
      } else if (ts.isClassDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'class', node, hasExportModifier(node))
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'interface', node, hasExportModifier(node))
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'type', node, hasExportModifier(node))
      } else if (ts.isEnumDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'enum', node, hasExportModifier(node))
      } else if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        addSymbol(node.name.text, 'method', node, hasExportModifier(node))
      } else if (ts.isGetAccessorDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        addSymbol('get ' + node.name.text, 'method', node, hasExportModifier(node))
      } else if (ts.isSetAccessorDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        addSymbol('set ' + node.name.text, 'method', node, hasExportModifier(node))
      } else if (ts.isPropertyDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        addSymbol(node.name.text, 'field', node, hasExportModifier(node))
      } else if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const init = node.initializer
        if (init) {
          if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
            addSymbol(node.name.text, 'arrow', node, hasExportModifier(node.parent.parent))
          } else if (ts.isClassExpression(init)) {
            addSymbol(node.name.text, 'class', node, hasExportModifier(node.parent.parent))
          }
        }
      } else if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          imports.push({ source: node.moduleSpecifier.text, startLine: line, endLine: line })
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          imports.push({ source: node.moduleSpecifier.text, startLine: line, endLine: line })
        }
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          for (const spec of node.exportClause.elements) {
            exports.push({ name: spec.name.text, startLine: line, endLine: line })
          }
        }
      } else if (ts.isExportAssignment(node) && node.isExportEquals !== false) {
        if (node.expression && ts.isIdentifier(node.expression)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          exports.push({ name: node.expression.text, startLine: line, endLine: line })
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    if (symbols.length === 0 && imports.length === 0 && exports.length === 0) {
      const fallback = this.extractSymbols(content, filePath)
      if (fallback.length > 0) {
        return { symbols: fallback, imports: this.extractFileImports(content), exports: this.extractFileExports(content) }
      }
    }

    return { symbols, imports, exports }
  }

  private extractFileImports(content: string): { source: string; startLine: number; endLine: number }[] {
    const imports: { source: string; startLine: number; endLine: number }[] = []
    const lines = content.split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      let m: RegExpMatchArray | null

      m = line.match(/^\s*import\s+(?:type\s+)?(?:\{[^}]*\}|[^;{]+)\s+from\s+['"]([^'"]+)['"]/)
      if (m) {
        imports.push({ source: m[1], startLine: i + 1, endLine: i + 1 })
        i++
        continue
      }

      m = line.match(/^\s*import\s+['"]([^'"]+)['"]/)
      if (m) {
        imports.push({ source: m[1], startLine: i + 1, endLine: i + 1 })
        i++
        continue
      }

      m = line.match(/(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/)
      if (m) {
        imports.push({ source: m[1], startLine: i + 1, endLine: i + 1 })
        i++
        continue
      }

      m = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)
      if (m) {
        imports.push({ source: m[1], startLine: i + 1, endLine: i + 1 })
        i++
        continue
      }

      i++
    }
    return imports
  }

  private extractFileExports(content: string): { name: string; startLine: number; endLine: number }[] {
    const exports: { name: string; startLine: number; endLine: number }[] = []
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      let m = line.match(/^\s*export\s+(?:default\s+)?(?:function|class|interface|type|enum|const|let|var|async\s+function)\s+([A-Za-z_][\w]*)/)
      if (m) { exports.push({ name: m[1], startLine: i + 1, endLine: i + 1 }); continue }

      m = line.match(/^\s*export\s*\{\s*([^}]+)\s*\}/)
      if (m) {
        const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
        for (const n of names) exports.push({ name: n, startLine: i + 1, endLine: i + 1 })
        continue
      }

      m = line.match(/^\s*export\s+default\s+(.+)/)
      if (m) {
        const parts = m[1].trim().split(/[;\s]/)
        if (parts[0] && parts[0] !== '{' && parts[0] !== 'function' && parts[0] !== 'class') {
          exports.push({ name: parts[0], startLine: i + 1, endLine: i + 1 })
        }
      }
    }
    return exports
  }

  private extractChunkKeywords(content: string, importSources: string[]): string[] {
    const keywords: string[] = []

    const commentLines = content.match(/\/\/\s*(.+?)$|#\s*(.+?)$/gm)
    if (commentLines) {
      for (const cl of commentLines) {
        const text = cl.replace(/^\/\/\s*|^#\s*/, '')
        const words = text.toLowerCase().split(/[^a-zA-Z0-9_]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
        keywords.push(...words)
      }
    }

    for (const src of importSources) {
      const name = src.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
      if (name.length >= 2) keywords.push(name)
    }

    const markers = content.match(/\b(TODO|FIXME|HACK|XXX|BUG|TEMP|NOTE|OPTIMIZE|WORKAROUND)\b/gi)
    if (markers) keywords.push(...markers.map(m => m.toLowerCase()))

    const strLiterals = content.match(/['"]([^'"]{3,60})['"]/g)
    if (strLiterals) {
      for (const sl of strLiterals) {
        const text = sl.replace(/['"]/g, '').toLowerCase()
        const words = text.split(/[^a-zA-Z0-9_]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
        keywords.push(...words)
      }
    }

    return [...new Set(keywords)]
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
      { kind: 'function', re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][\w]*)\s*\(/ },
      { kind: 'class', re: /^\s*(?:export\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'interface', re: /^\s*(?:export\s+)?interface\s+([A-Za-z_][\w]*)/ },
      { kind: 'type', re: /^\s*(?:export\s+)?type\s+([A-Za-z_][\w]*)\s*=/ },
      { kind: 'enum', re: /^\s*(?:export\s+)?enum\s+([A-Za-z_][\w]*)/ },
      { kind: 'const', re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=/ },
      { kind: 'method', re: /^\s*(?:public|private|protected)?\s*(?:async\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{/ },
      { kind: 'arrow', re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/ },
      { kind: 'arrow', re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=\s*function\s*(?:\([^)]*\))?/ },
      { kind: 'class', re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=\s*class\s/ },
      { kind: 'field', re: /^\s*(?:public|private|protected|readonly|static)\s+([A-Za-z_][\w]*)\s*[=:]\s*(?!function|class|async|\(|=>)/ },
    ]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const p of patterns) {
        const m = line.match(p.re)
        if (!m) continue
        const name = m[1]
        const signature = line.trim().slice(0, 220)
        const docPreview = i > 0 && lines[i - 1].trim().startsWith('//') ? lines[i - 1].trim().slice(0, 200) : undefined
        const exported = /^\s*export\s/.test(line)
        out.push({
          name,
          kind: p.kind,
          signature,
          filePath: filePath.replace(/\\/g, '/'),
          startLine: i + 1,
          endLine: i + 1,
          docPreview,
          exported,
        })
        break
      }
    }

    return out
  }
}
