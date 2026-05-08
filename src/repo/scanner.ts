import { readdirSync, statSync, openSync, readSync, closeSync } from 'fs'
import { join, basename } from 'path'

export interface ScanOptions {
  rootPath: string
  maxDepth?: number
  maxSizeBytes?: number
  additionalIgnores?: string[]
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size: number
  language: string
  children?: FileNode[]
}

export interface ScanResult {
  root: FileNode
  totalFiles: number
  totalDirs: number
  totalSize: number
  languages: Record<string, number>
}

const IGNORE_EXACT = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'dist', 'build', '.next', '.nuxt', '.output',
  '.cache', '.turbo', 'coverage', '.nyc_output',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.env', '.env.local', '.venv', 'venv',
  '.DS_Store', 'Thumbs.db',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
])

const IGNORE_GLOB = [
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.o', '.obj', '.lib', '.a',
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp4', '.avi', '.mov', '.mkv',
  '.mp3', '.wav', '.flac', '.ogg',
  '.wasm', '.map',
  '.min.js', '.bundle.js',
  '.log', '.lock',
]

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript (React)',
  js: 'JavaScript', jsx: 'JavaScript (React)', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rb: 'Ruby', rs: 'Rust', go: 'Go',
  java: 'Java', kt: 'Kotlin', scala: 'Scala',
  cs: 'C#', fs: 'F#',
  cpp: 'C++', c: 'C', h: 'C/C++ Header', hpp: 'C++ Header',
  swift: 'Swift', m: 'Objective-C',
  php: 'PHP', r: 'R', lua: 'Lua',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  pl: 'Perl', pm: 'Perl',
  sql: 'SQL', graphql: 'GraphQL', gql: 'GraphQL',
  html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', xml: 'XML', toml: 'TOML',
  md: 'Markdown', mdx: 'MDX', rst: 'reStructuredText',
  dockerfile: 'Dockerfile', makefile: 'Makefile',
  tf: 'Terraform', tfvars: 'Terraform',
  cmake: 'CMake',
  vue: 'Vue', svelte: 'Svelte', astro: 'Astro',
  nix: 'Nix', zig: 'Zig', dart: 'Dart',
  prisma: 'Prisma', proto: 'Protobuf',
}

function ext(name: string): string {
  const i = name.lastIndexOf('.')
  if (i <= 0) return name.toLowerCase()
  const after = name.slice(i + 1)
  if (after.includes('.')) return after.slice(after.lastIndexOf('.') + 1).toLowerCase()
  return after.toLowerCase()
}

function isIgnored(name: string): boolean {
  if (IGNORE_EXACT.has(name)) return true
  for (const suffix of IGNORE_GLOB) {
    if (name.endsWith(suffix)) return true
  }
  return false
}

function looksBinary(filePath: string): boolean {
  try {
    const fd = openSync(filePath, 'r')
    const buf = Buffer.alloc(4096)
    const bytesRead = readSync(fd, buf, 0, 4096, 0)
    closeSync(fd)
    return buf.subarray(0, bytesRead).includes(0)
  } catch {
    return false
  }
}

export function detectLanguage(filename: string): string {
  const e = ext(filename)
  return LANG_MAP[e] ?? ''
}

export class RepoScanner {
  scan(options: ScanOptions): ScanResult {
    return walkDir(options.rootPath, options.rootPath, options)
  }
}

function walkDir(root: string, dir: string, opts: ScanOptions, depth = 0): ScanResult {
  const name = basename(dir)
  const children: FileNode[] = []

  let totalFiles = 0
  let totalDirs = 0
  let totalSize = 0
  const languages: Record<string, number> = {}

  if (opts.maxDepth !== undefined && depth > opts.maxDepth) {
    return {
      root: { name, path: dir, type: 'dir', size: tryStat(dir), language: '', children },
      totalFiles: 0,
      totalDirs: 1,
      totalSize: 0,
      languages: {},
    }
  }

  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return {
      root: { name, path: dir, type: 'dir', size: 0, language: '', children },
      totalFiles: 0,
      totalDirs: 1,
      totalSize: 0,
      languages: {},
    }
  }

  for (const entry of entries) {
    if (isIgnored(entry)) continue

    const fullPath = join(dir, entry)

    let s: ReturnType<typeof statSync>
    try { s = statSync(fullPath) } catch { continue }

    if (s.isDirectory()) {
      const sub = walkDir(root, fullPath, opts, depth + 1)
      if (sub.totalFiles > 0 || sub.totalDirs > 1) {
        children.push(sub.root)
        totalFiles += sub.totalFiles
        totalDirs += sub.totalDirs
        totalSize += sub.totalSize
        for (const [lang, count] of Object.entries(sub.languages)) {
          languages[lang] = (languages[lang] ?? 0) + count
        }
      }
    } else if (s.isFile()) {
      if (opts.maxSizeBytes && s.size > opts.maxSizeBytes) continue
      if (s.size > 1_048_576 && !LANG_MAP[ext(entry)]) continue
      if (s.size > 0 && !LANG_MAP[ext(entry)] && looksBinary(fullPath)) continue

      const lang = detectLanguage(entry)
      children.push({ name: entry, path: fullPath, type: 'file', size: s.size, language: lang })
      totalFiles++
      totalSize += s.size
      if (lang) languages[lang] = (languages[lang] ?? 0) + 1
    }
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return {
    root: { name, path: dir, type: 'dir', size: tryStat(dir), language: '', children },
    totalFiles,
    totalDirs: totalDirs + 1,
    totalSize,
    languages,
  }
}

function tryStat(p: string): number {
  try { return statSync(p).size } catch { return 0 }
}

export function buildTreeString(result: ScanResult): string {
  const lines: string[] = [result.root.name + '/']
  buildTreeLines(result.root.children ?? [], '', lines)
  return lines.join('\n')
}

function buildTreeLines(children: FileNode[], prefix: string, lines: string[]): void {
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    const isLast = i === children.length - 1
    const label = node.type === 'dir' ? node.name + '/' : node.name
    lines.push(prefix + (isLast ? '└── ' : '├── ') + label)
    if (node.children?.length) {
      buildTreeLines(node.children, prefix + (isLast ? '    ' : '│   '), lines)
    }
  }
}

export function buildFlatList(result: ScanResult): string[] {
  const files: string[] = []
  function walk(nodes: FileNode[], prefix: string) {
    for (const n of nodes) {
      const p = prefix ? prefix + '/' + n.name : n.name
      if (n.type === 'dir') walk(n.children ?? [], p)
      else files.push(p)
    }
  }
  walk(result.root.children ?? [], '')
  return files
}
