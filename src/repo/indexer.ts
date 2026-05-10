import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Chunker } from './chunker.js'
import type { IndexChunk, ScoredChunk, InvertedIndexData, IndexProgress } from './types.js'
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

export class RepoIndexer {
  private chunks: IndexChunk[] = []
  private chunkLen: number[] = []
  private postings = new Map<string, { chunkIndex: number; tf: number }[]>()
  private fingerprint = ''
  private docCount = 0
  private avgDocLen = 0
  private k1 = 1.2
  private b = 0.75

  get isBuilt(): boolean {
    return this.chunks.length > 0
  }

  get chunkCount(): number {
    return this.chunks.length
  }

  get filePaths(): string[] {
    const seen = new Set<string>()
    for (const c of this.chunks) {
      seen.add(c.filePath)
    }
    return [...seen]
  }

  get currentFingerprint(): string {
    return this.fingerprint
  }

  build(files: string[], rootPath: string, fingerprint: string, onProgress?: (p: IndexProgress) => void): void {
    this.fingerprint = fingerprint
    this.chunks = []
    this.chunkLen = []
    this.postings.clear()
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
      const rawChunks = chunker.chunkByBoundaries(content)

      for (const c of rawChunks) {
        if (c.type === 'boundary' && c.lines.length <= 1) continue

        const chunkContent = c.lines.join('\n')
        const id = `${file}:${c.startLine}`
        const tokens = this.tokenize(chunkContent)
        if (tokens.length === 0) continue

        const chunk: IndexChunk = {
          id,
          filePath: file.replace(/\\/g, '/'),
          content: chunkContent,
          startLine: c.startLine,
          endLine: c.endLine,
          language: lang,
          label: c.label,
        }

        const chunkIndex = this.chunks.length
        this.chunks.push(chunk)
        this.chunkLen.push(tokens.length)
        this.docCount++
        totalTokens += tokens.length

        const tfMap = new Map<string, number>()
        for (const token of tokens) {
          tfMap.set(token, (tfMap.get(token) || 0) + 1)
        }

        for (const [term, tf] of tfMap) {
          let list = this.postings.get(term)
          if (!list) {
            list = []
            this.postings.set(term, list)
          }
          list.push({ chunkIndex, tf })
        }
      }
    }

    this.avgDocLen = this.docCount > 0 ? totalTokens / this.docCount : 0
  }

  search(query: string, topK = 6): ScoredChunk[] {
    if (this.chunks.length === 0) return []

    const queryTokens = this.tokenize(query)
    if (queryTokens.length === 0) return []

    const uniqueQueryTerms = [...new Set(queryTokens)]
    const expandedTerms = this.expandQueryTerms(uniqueQueryTerms)

    const candidateChunks = new Set<number>()
    for (const term of expandedTerms) {
      const list = this.postings.get(term)
      if (list) {
        for (const entry of list) {
          candidateChunks.add(entry.chunkIndex)
        }
      }
    }

    if (candidateChunks.size === 0) return []

    const scored: ScoredChunk[] = []
    for (const chunkIndex of candidateChunks) {
      const bm25 = this.score(uniqueQueryTerms, chunkIndex, expandedTerms)
      if (bm25 <= 0) continue

      const chunk = this.chunks[chunkIndex]
      const pathLower = chunk.filePath.toLowerCase()

      let pathBoost = 0
      for (const term of uniqueQueryTerms) {
        const fileName = pathLower.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
        if (fileName === term) pathBoost += 5
        else if (fileName.includes(term)) pathBoost += 3
        if (pathLower.includes('/' + term + '/') || pathLower.includes('/' + term + '.') || pathLower.includes('/' + term + '-')) pathBoost += 2
      }
      if (pathLower.startsWith('src/')) pathBoost += 0.5

      scored.push({ chunk, score: bm25 + pathBoost })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  }

  save(cacheDir: string): void {
    if (this.chunks.length === 0) return
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })

    const postings: Record<string, { chunkIndex: number; tf: number }[]> = {}
    for (const [term, list] of this.postings) {
      postings[term] = list
    }

    const data: InvertedIndexData = {
      fingerprint: this.fingerprint,
      totalChunks: this.chunks.length,
      chunks: this.chunks,
      postings,
      docCount: this.docCount,
      avgDocLen: this.avgDocLen,
    }

    const filePath = join(cacheDir, `index-${this.fingerprint}.json`)
    writeFileSync(filePath, JSON.stringify(data), 'utf-8')
  }

  load(cacheDir: string, fingerprint: string): boolean {
    const filePath = join(cacheDir, `index-${fingerprint}.json`)
    if (!existsSync(filePath)) return false

    try {
      const raw = readFileSync(filePath, 'utf-8')
      const data: InvertedIndexData = JSON.parse(raw)

      if (data.fingerprint !== fingerprint) return false

      this.fingerprint = data.fingerprint
      this.chunks = data.chunks
      this.chunkLen = data.chunks.map(c => this.tokenize(c.content).length)
      this.docCount = data.docCount
      this.avgDocLen = data.avgDocLen
      this.postings.clear()
      for (const [term, list] of Object.entries(data.postings)) {
        this.postings.set(term, list)
      }

      return true
    } catch {
      return false
    }
  }

  private tokenize(text: string): string[] {
    const tokens = text.toLowerCase().split(/[^a-zA-Z0-9_#.]+/).filter(Boolean)
    return tokens.filter(t => t.length >= MIN_TERM_LENGTH && !STOP_WORDS.has(t))
  }

  private expandQueryTerms(queryTerms: string[]): string[] {
    const expanded = new Set<string>()
    for (const qt of queryTerms) {
      expanded.add(qt)

      const prefixLen = Math.max(4, Math.ceil(qt.length * 0.6))
      const qtPrefix = qt.slice(0, prefixLen)
      if (qtPrefix.length >= 4) {
        for (const term of this.postings.keys()) {
          if (term.startsWith(qtPrefix) && term !== qt) {
            expanded.add(term)
          }
        }
      }
    }
    return [...expanded]
  }

  private score(queryTerms: string[], chunkIndex: number, expandedTerms?: string[]): number {
    const chunk = this.chunks[chunkIndex]
    const chunkTokens = this.tokenize(chunk.content)
    const chunkTF = new Map<string, number>()
    for (const t of chunkTokens) {
      chunkTF.set(t, (chunkTF.get(t) || 0) + 1)
    }

    const docLen = this.chunkLen[chunkIndex] || 1
    const avgLen = this.avgDocLen > 0 ? this.avgDocLen : docLen
    let score = 0

    const expansions = new Set(expandedTerms ? expandedTerms.filter(t => !queryTerms.includes(t)) : [])

    for (const term of queryTerms) {
      const idf = this.idf(term)
      if (idf === 0) continue

      const tf = chunkTF.get(term) || 0
      const qtf = queryTerms.filter(t => t === term).length

      const numerator = tf * (this.k1 + 1)
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / avgLen))
      const bm25Term = idf * (numerator / denominator)

      score += bm25Term * qtf
    }

    for (const exp of expansions) {
      const baseTerm = queryTerms.find(qt => {
        const prefixLen = Math.max(4, Math.ceil(qt.length * 0.6))
        return exp.startsWith(qt.slice(0, prefixLen)) && exp !== qt
      })
      if (!baseTerm) continue

      const tf = chunkTF.get(exp) || 0
      if (tf === 0) continue

      const expIdf = this.idf(exp)
      const numerator = tf * (this.k1 + 1)
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / avgLen))
      const bm25Term = expIdf * (numerator / denominator)

      score += bm25Term * 0.3
    }

    return score
  }

  private idf(term: string): number {
    const list = this.postings.get(term)
    if (!list || this.docCount === 0) return 0
    return Math.log(1 + (this.docCount - list.length + 0.5) / (list.length + 0.5))
  }
}
