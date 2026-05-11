import pc from 'picocolors'
import type { ThinkingStage } from '../repo/types.js'

const FRAMES = ['.', '..', '...']

function formatElapsed(ms: number): string {
  const total = Math.max(0, ms)
  const sec = Math.floor(total / 1000)
  const tenth = Math.floor((total % 1000) / 100)
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}.${tenth}`
}

export class ThinkingStatus {
  private stage: ThinkingStage = 'Generating response'
  private startedAt = Date.now()
  private interval: ReturnType<typeof setInterval> | null = null
  private frame = 0
  private enabled = !!process.stderr.isTTY

  start(initialStage: ThinkingStage): void {
    this.stage = initialStage
    this.startedAt = Date.now()
    if (!this.enabled) {
      process.stderr.write(pc.dim(`  ${this.stage}\n`))
      return
    }
    this.render()
    this.interval = setInterval(() => {
      this.frame = (this.frame + 1) % FRAMES.length
      this.render()
    }, 150)
  }

  update(stage: ThinkingStage): void {
    this.stage = stage
    if (!this.enabled) {
      process.stderr.write(pc.dim(`  ${this.stage}\n`))
      return
    }
    this.render()
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    if (this.enabled) process.stderr.write('\x1b[2K\r')
  }

  private render(): void {
    const elapsed = formatElapsed(Date.now() - this.startedAt)
    process.stderr.write(`\r${pc.dim(`  ${this.stage}${FRAMES[this.frame]} ${elapsed}`)}\x1b[K`)
  }
}
