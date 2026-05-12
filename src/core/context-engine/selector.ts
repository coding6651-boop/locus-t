import type { RepoIndexer } from '../../repo/indexer.js'

export interface FileScore {
  filePath: string
  score: number
  matches: string[]
}

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

function extractKeywords(query: string): string[] {
  const words = query.toLowerCase().split(/[^a-zA-Z0-9_+#.-]+/).filter(Boolean)
  const seen = new Set<string>()

  for (const word of words) {
    if (word.length < 2) continue
    if (STOP_WORDS.has(word)) continue

    const singular = word.replace(/ies$/, 'y').replace(/s$/, '')
    if (singular !== word && seen.has(singular)) continue
    seen.add(singular)
    seen.add(word)
  }

  return Array.from(seen)
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase()
}

function matchKeyword(target: string, keyword: string): boolean {
  if (target.includes(keyword)) return true

  const parts = target.split(/[/._-]/).filter(Boolean)
  return parts.some((p) => p === keyword || p.startsWith(keyword) || keyword.startsWith(p))
}

export class FileSelector {
  selectRelevant(query: string, allFiles: string[], topN = 15): FileScore[] {
    const keywords = extractKeywords(query)
    if (keywords.length === 0) return []

    const scored: FileScore[] = []

    for (const file of allFiles) {
      const result = this.scoreFile(file, keywords)
      if (result && result.score > 0) scored.push(result)
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topN)
  }

  selectByContent(query: string, index: RepoIndexer, topN = 6): FileScore[] {
    const results = index.search(query, topN * 2)
    if (results.length === 0) return []

    const fileScores = new Map<string, { score: number; matches: Set<string> }>()
    const queryKeywords = query.toLowerCase().split(/[^a-zA-Z0-9_+#.-]+/).filter(Boolean)

    for (const r of results) {
      const existing = fileScores.get(r.chunk.filePath) || { score: 0, matches: new Set<string>() }
      existing.score += r.score
      for (const kw of queryKeywords) {
        const contentLower = (r.chunk.content ?? '').toLowerCase()
        if (contentLower.includes(kw)) existing.matches.add(kw)
      }
      fileScores.set(r.chunk.filePath, existing)
    }

    const scored: FileScore[] = []
    for (const [filePath, info] of fileScores) {
      scored.push({
        filePath,
        score: info.score,
        matches: [...info.matches],
      })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topN)
  }

  private scoreFile(filePath: string, keywords: string[]): FileScore | null {
    const normalized = normalizePath(filePath)
    const fileName = normalized.split('/').pop() ?? ''
    const dirPath = normalized.split('/').slice(0, -1).join('/')
    let score = 0
    const matches: string[] = []
    const scoredKeywords = new Set<string>()

    for (const kw of keywords) {
      let fileScore = 0

      const exactFile = fileName === kw || fileName === kw + '.ts' || fileName === kw + '.js' ||
        fileName === kw + '.tsx' || fileName === kw + '.jsx' || fileName === kw + '.py'

      if (exactFile) {
        fileScore += 100
      }

      if (fileName.includes(kw)) {
        fileScore += 50
      }

      if (dirPath.includes(kw)) {
        fileScore += 30
      }

      if (matchKeyword(normalized, kw)) {
        fileScore += 20
      }

      if (fileScore > 0) {
        score += fileScore
        if (!scoredKeywords.has(kw)) {
          matches.push(kw)
          scoredKeywords.add(kw)
        }
      }
    }

    if (score === 0) return null

    if (fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts') || fileName.endsWith('.test.js')) {
      score *= 0.7
    }
    if (fileName.endsWith('.d.ts')) {
      score *= 0.5
    }

    return { filePath, score, matches }
  }
}
