import { estimateTokens } from '../../ai/tokenizer.js'

export interface TruncationResult {
  content: string
  originalLines: number
  remainingLines: number
}

function findBoundaryLines(lines: string[], maxLines: number): number {
  if (lines.length <= maxLines) return lines.length

  let bestBreak = maxLines

  for (let i = maxLines; i >= Math.floor(maxLines * 0.7); i--) {
    const line = lines[i - 1]

    if (line.trim() === '' && i > 0) {
      const nextLine = lines[i]?.trim() ?? ''
      if (
        nextLine.startsWith('function ') ||
        nextLine.startsWith('class ') ||
        nextLine.startsWith('export ') ||
        nextLine.startsWith('async ') ||
        nextLine.startsWith('def ') ||
        nextLine.startsWith('pub ') ||
        nextLine.startsWith('impl ') ||
        nextLine.startsWith('interface ') ||
        nextLine.startsWith('type ') ||
        nextLine.startsWith('const ') ||
        nextLine.startsWith('import ') ||
        nextLine.startsWith('# ')
      ) {
        bestBreak = i
        break
      }
    }
  }

  for (let i = maxLines; i >= Math.floor(maxLines * 0.5); i--) {
    const line = lines[i - 1]
    if (line.trim() === '') {
      bestBreak = i
      break
    }
  }

  return bestBreak
}

export function truncateSmart(
  content: string,
  _filePath: string,
  maxTokens: number,
): TruncationResult {
  if (estimateTokens(content) <= maxTokens) {
    const lines = content.split('\n')
    return { content, originalLines: lines.length, remainingLines: lines.length }
  }

  const maxChars = maxTokens * 4
  const averageLineLen = 40
  const maxLines = Math.floor(maxChars / averageLineLen) + 100

  const lines = content.split('\n')
  const breakPoint = findBoundaryLines(lines, Math.min(maxLines, lines.length))

  const kept = lines.slice(0, breakPoint)
  const remaining = lines.length - breakPoint
  const boundaryMatch = lines[breakPoint]?.trim() ?? ''

  let result = kept.join('\n')
  if (remaining > 0) {
    const boundaryHint = boundaryMatch
      ? ` (boundary: \`${boundaryMatch.slice(0, 60)}\`)`
      : ''
    result += `\n// ... (${remaining} more lines${boundaryHint})`
  }

  return { content: result, originalLines: lines.length, remainingLines: kept.length }
}
