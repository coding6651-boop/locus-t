export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function timestamp(): string {
  return new Date().toISOString()
}
