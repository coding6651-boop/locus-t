import { createHash } from 'crypto'
import { join } from 'path'
import type { Message } from '../../providers/types.js'
import { estimateTokens, truncateToTokens } from '../../ai/tokenizer.js'
import { RepoScanner, buildFlatList, type ScanResult, type FileNode } from '../../repo/scanner.js'
import { RepoIndexer } from '../../repo/indexer.js'
import { FileSelector } from './selector.js'
import { truncateSmart } from './truncator.js'
import { getBudget, trimHistoryToBudget } from './budget.js'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import type { ThinkingProgressEvent, ThinkingStage, IndexChunk } from '../../repo/types.js'

export type { TokenBudget } from './budget.js'
export { getBudget } from './budget.js'

export class ContextEngine {
  private nCtx: number
  private systemMessage: Message | null = null
  private selector: FileSelector
  private scanner: RepoScanner
  private indexer: RepoIndexer
  private indexFingerprint = ''
  private scanCache: { rootPath: string; result: ScanResult } | null = null
  private contentCache = new Map<string, string[]>()

  private static maxContextFiles(contextBudgetChars: number): number {
    return Math.max(8, Math.min(30, Math.floor(contextBudgetChars / 800)))
  }

  constructor(nCtx = 8192) {
    this.nCtx = nCtx
    this.selector = new FileSelector()
    this.scanner = new RepoScanner()
    this.indexer = new RepoIndexer()
  }

  setSystemMessage(msg: Message): void {
    this.systemMessage = msg
  }

  invalidateCache(): void {
    this.scanCache = null
    this.indexFingerprint = ''
    this.contentCache.clear()
  }

  private ensureScanned(rootPath?: string): ScanResult {
    const dir = rootPath ?? process.cwd()
    if (!this.scanCache || this.scanCache.rootPath !== dir) {
      const result = this.scanner.scan({ rootPath: dir, maxDepth: 8, maxSizeBytes: 1_048_576 })
      this.scanCache = { rootPath: dir, result }
    }
    return this.scanCache.result
  }

  getProjectFingerprint(rootPath?: string): string {
    const result = this.ensureScanned(rootPath)
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

  getAllFiles(rootPath?: string): string[] {
    const result = this.ensureScanned(rootPath)
    return buildFlatList(result)
  }

  ensureIndex(rootPath?: string, onProgress?: (evt: ThinkingProgressEvent) => void): void {
    const dir = rootPath ?? process.cwd()
    this.indexer.setRootPath(dir)
    const fingerprint = this.getProjectFingerprint(dir)
    if (this.indexer.isBuilt && this.indexFingerprint === fingerprint) return

    const indexDir = join(dir, '.locus', 'index')
    onProgress?.({ stage: 'Loading index', elapsedMs: 0 })
    if (this.indexer.load(indexDir, fingerprint)) {
      this.indexFingerprint = fingerprint
      return
    }

    const result = this.ensureScanned(dir)
    const allFiles = buildFlatList(result)
    if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true })
    this.indexer.build(allFiles, dir, fingerprint)
    this.indexer.save(indexDir)
    this.indexFingerprint = fingerprint
  }

  async selectContext(
    query: string,
    rootPath?: string,
    onProgress?: (evt: ThinkingProgressEvent) => void,
  ): Promise<string> {
    const dir = rootPath ?? process.cwd()
    const started = Date.now()
    const emit = (stage: ThinkingStage, detail?: string) => onProgress?.({ stage, elapsedMs: Date.now() - started, detail })
    const budget = getBudget(this.nCtx)
    const budgetChars = budget.context * 4

    emit('Scanning project')
    this.ensureScanned(dir)
    const allFiles = buildFlatList(this.scanCache!.result)

    emit('Loading index')
    this.ensureIndex(dir, onProgress)
    emit('Selecting symbols')
    const maxFiles = ContextEngine.maxContextFiles(budgetChars)
    const chunks = this.indexer.search(query, maxFiles)
    emit('Scoring matches', `${chunks.length} chunks`)
    const fromIndex = chunks.length > 0

    if (!fromIndex) {
      const pathRelevant = this.selector.selectRelevant(query, allFiles, maxFiles)
      if (pathRelevant.length === 0) return ''
      emit('Building context')
      return this.assembleFromPaths(pathRelevant, dir, budgetChars)
    }

    const relevantPaths = new Set(chunks.map(c => c.chunk.filePath))
    const rootDir = this.scanCache!.rootPath
    const tree = buildCompactTree(this.scanCache!.result.root, 3, rootDir.replace(/\\/g, '/'), relevantPaths)
    const parts: string[] = []
    let totalChars = 0

    if (tree) {
      const treeBlock = `Project structure:\n${tree}\n`
      parts.push(treeBlock)
      totalChars += treeBlock.length
    }

    emit('Building context')
    const seenFiles = new Set<string>()
    for (const sc of chunks) {
      const c = this.hydrateChunk(sc.chunk, dir)
      const lang = detectLanguageFromPath(c.filePath)
      const header = c.label ? `# ${c.filePath}:${c.startLine} (${c.label})` : `# ${c.filePath}:${c.startLine}`
      const content = c.content ?? ''

      const summary = seenFiles.has(c.filePath) ? '' : this.getFileSummary(c.filePath, dir)
      seenFiles.add(c.filePath)
      const meta = ContextEngine.formatChunkMeta(c, content, summary)
      const block = `\n${header}\n${meta}\n\`\`\`${lang}\n${content}\n\`\`\`\n`

      if (totalChars + block.length > budgetChars) {
        if (totalChars === 0) {
          const remaining = budgetChars - totalChars
          const trimmed = block.slice(0, remaining) + '\n```\n'
          parts.push(trimmed)
        }
        break
      }

      parts.push(block)
      totalChars += block.length
    }

    return parts.join('\n').trim()
  }

  private readFileLines(relativePath: string, rootPath: string): string[] | null {
    const fullPath = join(rootPath, relativePath)
    try {
      const text = readFileSync(fullPath, 'utf-8')
      const lines = text.split('\n')
      this.contentCache.set(relativePath, lines)
      return lines
    } catch {
      return null
    }
  }

  private getFileSummary(relativePath: string, rootPath: string): string {
    const lines = this.contentCache.get(relativePath) ?? this.readFileLines(relativePath, rootPath)
    if (!lines) return ''
    return extractFileSummary(lines, relativePath)
  }

  private hydrateChunk(chunk: IndexChunk, rootPath: string): IndexChunk {
    if (chunk.content && chunk.content.length > 0) return chunk
    const lines = this.contentCache.get(chunk.filePath) ?? this.readFileLines(chunk.filePath, rootPath)
    if (!lines) return { ...chunk, content: '' }
    const start = Math.max(0, chunk.startLine - 1)
    const end = Math.min(lines.length, chunk.endLine)
    return { ...chunk, content: lines.slice(start, end).join('\n') }
  }

  private static formatChunkMeta(chunk: IndexChunk, content: string, summary: string): string {
    const parts: string[] = []
    const lineCount = content.split('\n').length
    parts.push(`lines: ${lineCount}`)
    if (chunk.imports && chunk.imports.length > 0) parts.push(`imports: ${chunk.imports.join(', ')}`)
    if (chunk.exportNames && chunk.exportNames.length > 0) parts.push(`exports: ${chunk.exportNames.join(', ')}`)
    let result = `// ${parts.join(' | ')}`
    if (summary) result = `// Summary: ${summary}\n${result}`
    return result
  }

  private assembleFromPaths(files: import('./selector.js').FileScore[], rootPath: string, budgetChars: number): string {
    const parts: string[] = []
    let totalChars = 0

    for (const file of files) {
      try {
        const lines = this.readFileLines(file.filePath, rootPath)
        if (!lines) continue
        const lang = detectLanguageFromPath(file.filePath)
        const content = lines.join('\n')
        const truncated = truncateSmart(content, file.filePath, 200)
        const summary = extractFileSummary(lines, file.filePath)
        const metaParts: string[] = [`lines: ${lines.length}`]
        let meta = `// ${metaParts.join(' | ')}`
        if (summary) meta = `// Summary: ${summary}\n${meta}`
        const header = `# ${file.filePath}`
        const block = `\n${header}\n${meta}\n\`\`\`${lang}\n${truncated.content}\n\`\`\`\n`

        if (totalChars + block.length > budgetChars) {
          if (totalChars === 0) {
            const remaining = budgetChars - totalChars
            const trimmed = block.slice(0, remaining) + '\n```\n'
            parts.push(trimmed)
          }
          break
        }

        parts.push(block)
        totalChars += block.length
      } catch {
        continue
      }
    }

    return parts.join('\n').trim()
  }

  prune(messages: Message[]): Message[] {
    const budget = getBudget(this.nCtx)
    const trimmed = trimHistoryToBudget(messages, budget, this.systemMessage)
    if (this.systemMessage) trimmed.unshift(this.systemMessage)
    return trimmed
  }

  pruneWithContext(messages: Message[], fileContext: string): Message[] {
    const contextTokenEstimate = estimateTokens(fileContext)
    const budget = getBudget(this.nCtx)
    const adjustedHistory = budget.history - contextTokenEstimate
    const historyBudget = Math.max(adjustedHistory, 500)

    const trimmed = trimHistoryToBudget(
      messages,
      { ...budget, history: historyBudget },
      this.systemMessage,
    )

    if (this.systemMessage) trimmed.unshift(this.systemMessage)
    return trimmed
  }

  truncateToolResult(result: string): string {
    return truncateToTokens(result, 500)
  }
}

function buildCompactTree(root: FileNode, maxDepth: number, rootDir: string, relevantPaths: Set<string>): string {
  const lines: string[] = []
  function relMatch(dirPath: string): boolean {
    return [...relevantPaths].some(rp => {
      const parts = rp.replace(rootDir, '').replace(/^\/+/, '').split('/')
      const rel = parts.slice(0, -1).join('/')
      return rel.startsWith(dirPath)
    })
  }
  function walk(nodes: FileNode[], prefix: string, depth: number) {
    if (depth > maxDepth) return
    for (const n of nodes) {
      const p = prefix ? prefix + '/' + n.name : n.name
      if (n.type === 'dir') {
        const shouldExpand = depth < 2 || relMatch(p)
        if (shouldExpand) lines.push(p + '/')
        if (shouldExpand && depth < maxDepth) walk(n.children ?? [], p, depth + 1)
      } else if (depth < 1) {
        lines.push(p)
      }
    }
  }
  walk(root.children ?? [], '', 0)
  return lines.join('\n')
}

function extractFileSummary(lines: string[], filePath: string): string {
  const maxScan = Math.min(lines.length, 30)
  const commentLines: string[] = []
  let startIdx = 0
  if (lines.length > 0 && lines[0].trimStart().startsWith('#!')) startIdx = 1

  let i = startIdx
  while (i < maxScan) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('/**')) {
      i++
      while (i < maxScan) {
        const line = lines[i].trim()
        if (line.endsWith('*/')) {
          const cleaned = line.replace('*/', '').trim().replace(/^\*\s?/, '')
          if (cleaned) commentLines.push(cleaned)
          break
        }
        const cleaned = line.replace(/^\*\s?/, '').trim()
        if (cleaned) commentLines.push(cleaned)
        i++
      }
      break
    }
    if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
      commentLines.push(trimmed.replace(/^\/\/\s?/, '').trim())
    } else if (trimmed !== '' && !trimmed.startsWith('//')) {
      break
    }
    i++
  }

  if (commentLines.length > 0) {
    const first = commentLines.find(l => l.length > 0)
    if (first) return first.length > 120 ? first.slice(0, 117) + '...' : first
  }

  const fileName = filePath.split('/').pop()?.split('\\').pop() ?? ''
  const withoutExt = fileName.replace(/\.[^.]+$/, '')
  return withoutExt.replace(/([A-Z])/g, ' $1').replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim()
}

function detectLanguageFromPath(filePath: string): string {
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java',
    cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift',
    cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    vue: 'vue', svelte: 'svelte', astro: 'astro',
    css: 'css', scss: 'scss', html: 'html',
    json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', md: 'markdown',
    sql: 'sql', graphql: 'graphql', gql: 'graphql',
    sh: 'bash', bash: 'bash', zsh: 'bash',
    dockerfile: 'dockerfile', makefile: 'makefile',
    tf: 'terraform', toml: 'toml',
  }
  const i = filePath.lastIndexOf('.')
  if (i < 0) return ''
  const ext = filePath.slice(i + 1).toLowerCase()
  return map[ext] ?? ext
}
