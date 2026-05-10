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
  private static readonly MAX_CONTEXT_FILES = 6

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

  ensureIndex(rootPath?: string): void {
    const dir = rootPath ?? process.cwd()
    const fingerprint = this.getProjectFingerprint(dir)
    if (this.indexer.isBuilt && this.indexFingerprint === fingerprint) return

    const indexDir = join(dir, '.locus', 'index')
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

  async selectContext(query: string, rootPath?: string): Promise<string> {
    const dir = rootPath ?? process.cwd()
    const budget = getBudget(this.nCtx)
    const budgetChars = budget.context * 4

    this.ensureScanned(dir)
    const allFiles = buildFlatList(this.scanCache!.result)

    this.ensureIndex(dir)
    const chunks = this.indexer.search(query, ContextEngine.MAX_CONTEXT_FILES)
    const fromIndex = chunks.length > 0

    if (!fromIndex) {
      const pathRelevant = this.selector.selectRelevant(query, allFiles, ContextEngine.MAX_CONTEXT_FILES)
      if (pathRelevant.length === 0) return ''
      return this.assembleFromPaths(pathRelevant, budgetChars)
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

    for (const sc of chunks) {
      const c = sc.chunk
      const lang = detectLanguageFromPath(c.filePath)
      const header = c.label ? `# ${c.filePath}:${c.startLine} (${c.label})` : `# ${c.filePath}:${c.startLine}`
      const block = `\n${header}\n\`\`\`${lang}\n${c.content}\n\`\`\`\n`

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

  private assembleFromPaths(files: import('./selector.js').FileScore[], budgetChars: number): string {
    const parts: string[] = []
    let totalChars = 0

    for (const file of files) {
      try {
        const content = readFileSync(file.filePath, 'utf-8')
        const lang = detectLanguageFromPath(file.filePath)
        const truncated = truncateSmart(content, file.filePath, 200)
        const header = `# ${file.filePath}`
        const block = `\n${header}\n\`\`\`${lang}\n${truncated.content}\n\`\`\`\n`

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
