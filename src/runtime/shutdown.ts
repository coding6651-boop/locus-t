import { stopLifecycle } from './lifecycle.js'

const cleanupFns: (() => void | Promise<void>)[] = []

export function onShutdown(fn: () => void | Promise<void>): void {
  cleanupFns.push(fn)
}

export async function shutdown(): Promise<void> {
  for (const fn of cleanupFns) {
    try { await fn() } catch { }
  }
  stopLifecycle()
  process.exit(0)
}

process.on('SIGINT', async () => {
  process.stdout.write('\n')
  await shutdown()
})

process.on('SIGTERM', async () => {
  await shutdown()
})
