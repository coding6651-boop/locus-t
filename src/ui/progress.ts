export function progressBar(fraction: number, width = 24): string {
  const clamped = Math.min(1, Math.max(0, fraction))
  const filled = Math.round(clamped * width)
  const empty = width - filled
  const bar = '\x1b[38;5;45m' + '━'.repeat(filled) + '\x1b[39m'
    + '\x1b[2m' + '╌'.repeat(empty) + '\x1b[22m'
  const pct = String(Math.round(clamped * 100)).padStart(3)
  return `${bar} ${pct}%`
}

export function dimmedLabel(label: string): string {
  return `\x1b[2m${label}\x1b[22m`
}
