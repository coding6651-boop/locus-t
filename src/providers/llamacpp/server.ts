import type { LLMConfig } from '../types.js'
import { spawn, type ChildProcess } from 'child_process'

export class LlamaCppServer {
  private proc: ChildProcess | null = null

  async start(config: LLMConfig): Promise<void> {
    // Stub — will spawn llama-server as subprocess
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
  }

  get isRunning(): boolean {
    return this.proc !== null
  }
}
