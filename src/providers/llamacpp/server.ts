import pc from 'picocolors'
import { spawn, execSync } from 'child_process'
import { findBinary } from './binary.js'
import { checkHealth } from './health.js'
import type { ServerConfig, ServerStatus, HealthResult } from './types.js'

export class LlamaCppServer {
  private proc: import('child_process').ChildProcess | null = null
  private startTime = 0
  private config: ServerConfig | null = null
  private stderrBuf = ''

  get isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null && this.proc.killed === false
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

  get lastStderr(): string {
    return this.stderrBuf
  }

  async start(config: ServerConfig): Promise<void> {
    this.config = config
    this.stderrBuf = ''

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

    const isWin = process.platform === 'win32'
    const hasSpaces = [binaryPath, ...args].some((a) => a.includes(' '))

    if (isWin && hasSpaces) {
      const escaped = [binaryPath, ...args].map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')
      this.proc = spawn(escaped, [], { shell: true, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    } else {
      this.proc = spawn(binaryPath, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    }

    this.startTime = Date.now()

    this.proc.stderr?.on('data', (data: Buffer) => {
      this.stderrBuf += data.toString()
    })

    return new Promise((resolve, reject) => {
      const startupTimer = setTimeout(() => {
        resolve()
      }, 2000)

      this.proc!.on('error', (err) => {
        clearTimeout(startupTimer)
        this.proc = null
        reject(new Error(`Failed to start llama-server: ${err.message}`))
      })

      this.proc!.on('exit', (code) => {
        clearTimeout(startupTimer)
        if (code !== 0 && code !== null && !this.proc?.killed) {
          const errMsg = this.getStartupError()
          this.proc = null
          reject(new Error(`llama-server exited (code ${code}): ${errMsg}`))
        }
        this.proc = null
      })

      this.proc!.on('spawn', () => {
        setTimeout(() => resolve(), 500)
      })
    })
  }

  async waitForReady(timeoutMs = 120_000, onProgress?: (msg: string) => void): Promise<HealthResult> {
    if (!this.config) throw new Error('Server not configured')

    const baseUrl = `http://${this.config.host}:${this.config.port}`
    const start = Date.now()

    // Wait for process to actually start (port bind)
    await new Promise((r) => setTimeout(r, 1500))

    while (Date.now() - start < timeoutMs) {
      const result = await checkHealth(baseUrl)
      if (result.healthy) return result

      if (!this.isRunning && this.proc === null) {
        return {
          healthy: false,
          status: 'crashed',
          modelLoaded: false,
          error: this.getStartupError() || 'llama-server process died during startup',
        }
      }

      onProgress?.(`.`)
      await new Promise((r) => setTimeout(r, 1000))
    }

    return {
      healthy: false,
      status: 'timeout',
      modelLoaded: false,
      error: this.getStartupError() || `llama-server did not respond within ${timeoutMs / 1000}s`,
    }
  }

  async stop(timeoutMs = 10_000): Promise<void> {
    const proc = this.proc
    if (!proc || proc.exitCode !== null) {
      this.proc = null
      return
    }

    const pid = proc.pid

    await new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        try { proc.kill('SIGKILL') } catch { }
        resolve()
      }, timeoutMs)

      proc.on('exit', () => {
        clearTimeout(killTimer)
        resolve()
      })

      try {
        if (pid !== undefined) {
          if (process.platform === 'win32') {
            execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore', windowsHide: true })
          } else {
            proc.kill('SIGTERM')
          }
        }
      } catch { }
    })

    this.proc = null
  }

  getStartupError(): string {
    const lines = this.stderrBuf.split('\n').filter((l) => l.trim()).slice(-5)
    return lines.length > 0 ? lines.join('; ') : '(no error output)'
  }

  isSecurityBlock(): boolean {
    const msg = this.stderrBuf.toLowerCase()
    return msg.includes('blocked') ||
      msg.includes('device guard') ||
      msg.includes('applocker') ||
      msg.includes('administrator') ||
      msg.includes('permission denied') ||
      msg.includes('access is denied') ||
      msg.includes('eacces') ||
      msg.includes('windows defender')
  }
}
