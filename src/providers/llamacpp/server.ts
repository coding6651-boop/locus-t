import pc from 'picocolors'
import { execSync } from 'child_process'
import type { ServerConfig, ServerStatus, HealthResult } from './types.js'
import { checkHealth } from './health.js'

export class LlamaCppServer {
  private proc: import('child_process').ChildProcess | null = null
  private startTime = 0
  private config: ServerConfig | null = null

  get isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null
  }

  get status(): ServerStatus | null {
    if (!this.config || !this.proc) return null
    return {
      running: this.isRunning,
      pid: this.proc.pid ?? null,
      port: this.config.port,
      model: this.config.modelPath,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
    }
  }

  async start(config: ServerConfig): Promise<void> {
    this.config = config
    const { spawn } = await import('child_process')
    const { findBinary } = await import('./binary.js')

    const binaryPath = config.binaryPath ?? findBinary()
    if (!binaryPath) {
      throw new Error(
        `llama-server not found.\n` +
        `  Install it or set binaryPath in config.\n` +
        `  ${pc.dim('https://github.com/ggml-org/llama.cpp')}`
      )
    }

    const args = [
      '-m', config.modelPath,
      '--host', config.host,
      '--port', String(config.port),
      '-c', String(config.nCtx),
    ]

    if (config.nGpuLayers > 0) {
      args.push('-ngl', String(config.nGpuLayers))
    }

    this.proc = spawn(binaryPath, args, {
      stdio: config.verbose ? 'inherit' : 'ignore',
    })

    this.startTime = Date.now()

    this.proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        process.stderr.write(pc.red(`\nllama-server exited with code ${code}\n`))
      }
      this.proc = null
    })

    this.proc.on('error', (err) => {
      throw new Error(`Failed to start llama-server: ${err.message}`)
    })
  }

  async waitForReady(timeoutMs = 60_000): Promise<HealthResult> {
    if (!this.config) throw new Error('Server not configured')

    const baseUrl = `http://${this.config.host}:${this.config.port}`
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      const result = await checkHealth(baseUrl)
      if (result.healthy) return result
      await new Promise((r) => setTimeout(r, 1000))
    }

    return {
      healthy: false,
      status: 'timeout',
      modelLoaded: false,
      error: `llama-server did not become healthy within ${timeoutMs / 1000}s`,
    }
  }

  async stop(timeoutMs = 10_000): Promise<void> {
    if (!this.proc || this.proc.exitCode !== null) {
      this.proc = null
      return
    }

    const proc = this.proc
    const pid = proc.pid

    return new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        try { proc.kill('SIGKILL') } catch { }
        this.proc = null
        resolve()
      }, timeoutMs)

      proc.on('exit', () => {
        clearTimeout(killTimer)
        this.proc = null
        resolve()
      })

      try {
        if (process.platform === 'win32' && pid !== undefined) {
          execSync(`taskkill /PID ${pid} /F /T 2>nul`, { stdio: 'ignore' })
        } else {
          proc.kill('SIGTERM')
        }
      } catch { }
    })
  }
}
