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

const AMBIGUOUS_KEYWORDS = new Set(['path', 'file'])

const FAST_PATH_PATTERNS = [
  /^where\s+(is|are|can\s+i\s+find)\b/i,
  /^find\s+/i,
  /^locate\s+/i,
  /^show\s+me\s+/i,
  /in\s+which\s+file/i,
  /path\s+to\s+/i,
]

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

function cleanQuery(query: string): string {
  let s = query
    .replace(/^find\s+(me\s+)?/i, '')
    .replace(/^where\s+(is|are|can\s+i\s+find|the)\s+/i, '')
    .replace(/^where's\s+/i, '')
    .replace(/^locate\s+/i, '')
    .replace(/^show\s+me\s+/i, '')
    .replace(/^in\s+which\s+(file|directory|folder)\s+/i, '')
    .replace(/^path\s+to\s+/i, '')
    .replace(/\s+is\s+located$/i, '')
    .replace(/\s+(located|found|stored)\s+(in|at|under|inside?)/gi, '')
    .replace(/^the\s+/i, '')
    .trim()
  if (!s || STOP_WORDS.has(s.toLowerCase())) s = ''
  return s
}

export function isFastPathCandidate(query: string): boolean {
  return FAST_PATH_PATTERNS.some(p => p.test(query.trim()))
}

export function resolveFastPath(query: string, allFiles: string[]): string | null {
  const keywords = extractKeywords(query)
  if (keywords.length === 0) return null

  const kwMatchCounts = new Map<string, number>()
  for (const file of allFiles) {
    const normalized = normalizePath(file)
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        kwMatchCounts.set(kw, (kwMatchCounts.get(kw) || 0) + 1)
      }
    }
  }

  const specificKw = keywords
    .filter(kw => !AMBIGUOUS_KEYWORDS.has(kw) && (kwMatchCounts.get(kw) || 0) > 0)
    .sort((a, b) => (kwMatchCounts.get(a) || Infinity) - (kwMatchCounts.get(b) || Infinity))

  if (specificKw.length === 0) return null

  const dirScores = new Map<string, { score: number; files: string[] }>()

  for (const file of allFiles) {
    const normalized = normalizePath(file)
    let matchScore = 0
    for (const kw of keywords) {
      if (normalized.includes(kw)) matchScore++
    }
    if (matchScore === 0) continue

    const parts = normalized.split('/')
    for (let i = 1; i <= parts.length; i++) {
      const dir = parts.slice(0, i).join('/')
      if (!dir) continue
      const existing = dirScores.get(dir) || { score: 0, files: [] }
      existing.score += matchScore
      existing.files.push(file)
      dirScores.set(dir, existing)
    }
  }

  if (dirScores.size === 0) return null

  let bestDir = ''
  let bestScore = 0
  let bestFileCount = 0

  for (const [dir, info] of dirScores) {
    const depth = dir.split('/').length
    const weighted = info.score + depth * 15
    if (weighted > bestScore) {
      bestScore = weighted
      bestDir = dir
      bestFileCount = info.files.length
    }
  }

  if (!bestDir) return null

  const label = cleanQuery(query)
  const prefix = label
    ? label.charAt(0).toUpperCase() + label.slice(1)
    : specificKw[0].charAt(0).toUpperCase() + specificKw[0].slice(1)

  if (bestFileCount > 1) {
    const count = bestFileCount > 999 ? bestFileCount + '+' : bestFileCount
    return `${prefix} is at \`${bestDir}/\` — ${count} file${bestFileCount === 1 ? '' : 's'}.`
  }
  return `${prefix} is at \`${bestDir}\`.`
}
