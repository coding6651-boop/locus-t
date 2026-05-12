import pc from 'picocolors'

const LANG_LABELS: Record<string, string> = {
  typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python',
  rust: 'Rust', go: 'Go', java: 'Java', csharp: 'C#', ruby: 'Ruby',
  php: 'PHP', swift: 'Swift', cpp: 'C++', c: 'C',
  css: 'CSS', scss: 'SCSS', html: 'HTML', json: 'JSON',
  yaml: 'YAML', xml: 'XML', markdown: 'Markdown', md: 'Markdown',
  sql: 'SQL', graphql: 'GraphQL', bash: 'Bash', sh: 'Shell',
  dockerfile: 'Dockerfile', makefile: 'Makefile', toml: 'TOML',
  ts: 'TypeScript', js: 'JavaScript', py: 'Python', rs: 'Rust',
  vue: 'Vue', svelte: 'Svelte', tsx: 'TypeScript',
}

const LANG_COLORS: Record<string, number> = {
  typescript: 39, ts: 39, tsx: 39,
  javascript: 220, js: 220, jsx: 220,
  python: 33, py: 33,
  rust: 208, rs: 208,
  go: 45, java: 196, csharp: 129, cs: 129,
  ruby: 196, rb: 196,
  css: 39, scss: 205, html: 208,
  json: 220, yaml: 196, yml: 196,
  bash: 40, sh: 40, shell: 40,
  sql: 45, markdown: 252, md: 252,
}

const FILE_ICONS: Record<string, string> = {
  ts: '󰛦', tsx: '󰛦', js: '', jsx: '',
  py: '', rs: '🦀', go: '🐹', java: '',
  json: '', yaml: '', yml: '', toml: '',
  md: '', html: '', css: '🎨', scss: '🎨',
  sh: '', bash: '', sql: '🗃',
  default: '📄',
}

const DIR_ICON = pc.cyan('📂')
const FILE_ICON_DEFAULT = pc.dim('  ')
const TREE_PIPE = pc.dim('│')
const TREE_TEE = pc.dim('├──')
const TREE_LAST = pc.dim('└──')
const TREE_SPACE = '   '

function fg256(code: number, text: string): string {
  return `\x1b[38;5;${code}m${text}\x1b[39m`
}

function getFileIcon(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() ?? '' : ''
  return FILE_ICONS[ext] ?? FILE_ICONS.default
}

function getLangColor(lang: string): number {
  return LANG_COLORS[lang.toLowerCase()] ?? 252
}

function formatCodeBlockHeader(lang: string): string {
  const label = LANG_LABELS[lang.toLowerCase()] ?? lang
  const color = getLangColor(lang)
  const langTag = lang ? ` ${fg256(color, label)} ` : ''
  const barColor = lang ? color : 245
  return `  ${fg256(barColor, '┌')}${langTag}${fg256(barColor, '─'.repeat(Math.max(1, 40 - (label.length + 2))))}`
}

function formatCodeLine(line: string, lang: string): string {
  const color = getLangColor(lang)
  return `  ${fg256(color, '│')} ${pc.dim(line)}`
}

function formatCodeBlockFooter(lang: string): string {
  const color = getLangColor(lang)
  return `  ${fg256(color, '└' + '─'.repeat(40))}`
}

function formatFilePath(path: string): string {
  const icon = getFileIcon(path)
  return `${pc.dim(icon)} ${pc.cyan(pc.underline(path))}`
}

function formatTreeLine(line: string, isLast: boolean, depth: number): string {
  const indent = TREE_SPACE.repeat(depth)
  const connector = isLast ? TREE_LAST : TREE_TEE
  const isDir = line.endsWith('/')
  const name = isDir ? line.slice(0, -1) : line
  const icon = isDir ? DIR_ICON : pc.dim(getFileIcon(name))
  const styled = isDir ? pc.bold(pc.cyan(name)) : pc.white(name)
  return `  ${indent}${connector} ${icon} ${styled}`
}

export class ResponseFormatter {
  private buffer = ''
  private inCodeBlock = false
  private codeLang = ''
  private codeLines: string[] = []
  private outputFn: (text: string) => void
  private lineBuffer = ''

  constructor(outputFn: (text: string) => void) {
    this.outputFn = outputFn
  }

  write(token: string): void {
    this.buffer += token
    this.lineBuffer += token

    while (this.lineBuffer.includes('\n')) {
      const nlIdx = this.lineBuffer.indexOf('\n')
      const line = this.lineBuffer.slice(0, nlIdx)
      this.lineBuffer = this.lineBuffer.slice(nlIdx + 1)
      this.processLine(line)
    }
  }

  flush(): void {
    if (this.lineBuffer) {
      this.processLine(this.lineBuffer)
      this.lineBuffer = ''
    }
    if (this.inCodeBlock) {
      this.emitCodeBlock()
    }
  }

  private processLine(line: string): void {
    const codeStart = line.match(/^```(\w*)/)
    const codeEnd = line.match(/^```\s*$/)

    if (this.inCodeBlock) {
      if (codeEnd && this.codeLines.length > 0) {
        this.emitCodeBlock()
        return
      }
      this.codeLines.push(line)
      return
    }

    if (codeStart && !this.inCodeBlock) {
      this.inCodeBlock = true
      this.codeLang = codeStart[1] || ''
      this.codeLines = []
      return
    }

    this.outputFn(this.formatInline(line) + '\n')
  }

  private emitCodeBlock(): void {
    this.inCodeBlock = false
    this.outputFn(formatCodeBlockHeader(this.codeLang) + '\n')
    for (const cl of this.codeLines) {
      this.outputFn(formatCodeLine(cl, this.codeLang) + '\n')
    }
    this.outputFn(formatCodeBlockFooter(this.codeLang) + '\n')
    this.codeLines = []
    this.codeLang = ''
  }

  private formatInline(line: string): string {
    let result = line

    result = result.replace(/`([^`]+\.[a-zA-Z]{1,10}(?::\d+)?)`/g, (_m, path: string) => {
      return formatFilePath(path)
    })

    result = result.replace(/`([^`]+)`/g, (_m, code: string) => {
      return pc.yellow(code)
    })

    return result
  }
}

export function formatProjectTree(treeText: string): string {
  const lines = treeText.split('\n').filter(Boolean)
  const output: string[] = []
  output.push(`  ${pc.bold(pc.cyan('Project Structure'))}`)
  output.push(pc.dim('  ' + '─'.repeat(30)))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const depth = (line.match(/^(\s*)/)?.[1]?.length ?? 0) / 2
    const trimmed = line.trim()
    const isLast = i === lines.length - 1 ||
      (i + 1 < lines.length && (lines[i + 1].match(/^(\s*)/)?.[1]?.length ?? 0) / 2 <= depth)
    output.push(formatTreeLine(trimmed, isLast, depth))
  }

  output.push(pc.dim('  ' + '─'.repeat(30)))
  return output.join('\n')
}
