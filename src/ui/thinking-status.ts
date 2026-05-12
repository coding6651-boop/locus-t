import pc from 'picocolors'
import type { ThinkingStage } from '../repo/types.js'

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

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
      this.frame = (this.frame + 1) % SPINNER.length
      this.render()
    }, 80)
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
    const spin = pc.cyan(SPINNER[this.frame])
    process.stderr.write(`\r  ${spin} ${pc.dim(this.stage)}  ${pc.dim(elapsed)}\x1b[K`)
  }
}
