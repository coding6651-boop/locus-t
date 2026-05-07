import { stopLifecycle } from './lifecycle.js'

const cleanupFns: (() => void | Promise<void>)[] = []

export function onShutdown(fn: () => void | Promise<void>): void {
  cleanupFns.push(fn)
}

export async function shutdown(): Promise<void> {
  for (const fn of cleanupFns) await fn()
  stopLifecycle()
  process.exit(0)
}
