import pc from 'picocolors'

// ── ANSI 256-color helpers ──

function fg256(code: number, text: string): string {
  return `\x1b[38;5;${code}m${text}\x1b[39m`
}

// ── Gradient helpers ──

const GRADIENT_CYAN: number[] = [45, 39, 38, 37, 36, 35, 30]

export function gradientLine(text: string, palette: number[] = GRADIENT_CYAN): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const idx = Math.floor((i / text.length) * palette.length)
    out += fg256(palette[Math.min(idx, palette.length - 1)], text[i])
  }
  return out
}

// ── Box drawing ──

export const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
} as const

export function boxLine(content: string, width: number): string {
  const pad = width - stripAnsi(content).length
  const right = pad > 0 ? ' '.repeat(pad) : ''
  return `  ${pc.dim(BOX.vertical)} ${content}${right} ${pc.dim(BOX.vertical)}`
}

export function boxTop(width: number): string {
  return `  ${pc.dim(BOX.topLeft + BOX.horizontal.repeat(width + 2) + BOX.topRight)}`
}

export function boxBottom(width: number): string {
  return `  ${pc.dim(BOX.bottomLeft + BOX.horizontal.repeat(width + 2) + BOX.bottomRight)}`
}

// ── Dividers ──

export function divider(width = 44): string {
  return pc.dim('  ' + '─'.repeat(width))
}

export function thinDivider(width = 44): string {
  return pc.dim('  ' + '╌'.repeat(width))
}

// ── Icons ──

export const ICON = {
  success: pc.green('✔'),
  error: pc.red('✖'),
  warning: pc.yellow('⚠'),
  info: pc.cyan('ℹ'),
  arrow: pc.cyan('›'),
  dot: pc.dim('·'),
  bullet: pc.cyan('●'),
  circle: pc.dim('○'),
  prompt: pc.cyan('❯'),
  lock: pc.yellow('🔒'),
  key: pc.green('🔑'),
  gear: '⚙',
  brain: '🧠',
  folder: '📁',
  lightning: '⚡',
  sparkle: '✦',
} as const

// ── Styled section header ──

export function sectionHeader(title: string): string {
  return `  ${pc.bold(pc.cyan(title))}`
}

// ── Command entry for help menus ──

export function commandEntry(cmd: string, desc: string, indent = 4): string {
  const pad = ' '.repeat(indent)
  const cmdWidth = 22
  const formatted = pc.green(cmd.padEnd(cmdWidth))
  return `${pad}${formatted}${pc.dim(desc)}`
}

// ── Status badge ──

export function statusBadge(label: string, kind: 'success' | 'warning' | 'error' | 'info'): string {
  const colors = { success: pc.green, warning: pc.yellow, error: pc.red, info: pc.cyan }
  const icons = { success: '●', warning: '◐', error: '○', info: '●' }
  return `${colors[kind](icons[kind])} ${colors[kind](label)}`
}

// ── Key-value line ──

export function kvLine(key: string, value: string, keyWidth = 10): string {
  return `  ${pc.dim(key.padEnd(keyWidth))} ${value}`
}

// ── Strip ANSI for width calculations ──

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

// ── Timestamp formatting ──

export function relativeTime(ms: number): string {
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}
