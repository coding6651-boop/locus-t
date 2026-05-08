export interface Chunk {
  lines: string[]
  startLine: number
  endLine: number
  type: 'header' | 'code' | 'boundary'
  label?: string
}

const BOUNDARY_PATTERNS = [
  /^(function\s+\w+|async\s+function\s+\w+)/,
  /^(class\s+\w+)/,
  /^(export\s+(default\s+)?(function|class|const|let|var|interface|type|enum|abstract))/,
  /^(interface\s+\w+|type\s+\w+)/,
  /^(def\s+\w+|class\s+\w+)/,
  /^(pub\s+(fn|struct|enum|trait|impl|mod))/,
  /^(impl\s+\w+)/,
  /^(import\s+)/,
  /^(const\s+\w+\s*[=:])/,
  /^(async\s+\w+)/,
]

function classifyLine(line: string): Chunk['type'] {
  const trimmed = line.trim()
  if (!trimmed) return 'boundary'
  if (/^(import|export|from|require)/.test(trimmed)) return 'header'
  for (const p of BOUNDARY_PATTERNS) {
    if (p.test(trimmed)) return 'boundary'
  }
  return 'code'
}

export class Chunker {
  chunkByBoundaries(content: string, maxLines = 200): Chunk[] {
    const lines = content.split('\n')
    const chunks: Chunk[] = []
    let start = 0
    let type: Chunk['type'] = classifyLine(lines[0] ?? '')
    let label = extractLabel(lines[0] ?? '')

    for (let i = 1; i < lines.length; i++) {
      const currentType = classifyLine(lines[i])
      const currentLabel = extractLabel(lines[i] ?? '')

      if ((currentType === 'boundary' || i - start >= maxLines) && i > start) {
        chunks.push({ lines: lines.slice(start, i), startLine: start + 1, endLine: i, type, label })
        start = i
        type = currentType
        label = currentLabel
      } else if (currentType !== type && currentType === 'header') {
        chunks.push({ lines: lines.slice(start, i), startLine: start + 1, endLine: i, type, label })
        start = i
        type = currentType
        label = currentLabel
      }
    }

    if (start < lines.length) {
      chunks.push({ lines: lines.slice(start), startLine: start + 1, endLine: lines.length, type, label })
    }

    return chunks
  }

  chunk(content: string, maxSize = 1000): string[] {
    const lines = content.split('\n')
    const chunks: string[] = []
    for (let i = 0; i < lines.length; i += maxSize) {
      chunks.push(lines.slice(i, i + maxSize).join('\n'))
    }
    return chunks
  }
}

function extractLabel(line: string): string | undefined {
  const m = line.match(
    /(?:function|class|interface|type|enum|def|fn|struct|trait|const)\s+(\w+)/,
  )
  return m?.[1] ?? undefined
}
