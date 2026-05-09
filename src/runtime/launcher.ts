import { spawn, execSync } from 'child_process'
import { createWriteStream, existsSync } from 'fs'
import { runtimeBinaryPath, runtimeLogPath } from './paths.js'
import type { RuntimeStatus } from './types.js'

export class RuntimeLauncher {
  private proc: import('child_process').ChildProcess | null = null
  private startTime = 0
  private config: RuntimeLaunchConfig | null = null
  private logStream: import('fs').WriteStream | null = null
  private restartCount = 0
  private maxRestarts = 3
  private restartWindowMs = 30_000

  get isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null && this.proc.killed === false
  }

  get pid(): number | null {
    return this.proc?.pid ?? null
  }

  get status(): RuntimeStatus | null {
    if (!this.config) return null
    return {
      running: this.isRunning,
      pid: this.pid,
      port: this.config.port,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      model: this.config.modelPath,
    }
  }

  async start(config: RuntimeLaunchConfig): Promise<void> {
    this.config = config
    this.restartCount = 0

    const binaryPath = runtimeBinaryPath()
    if (!existsSync(binaryPath)) {
      throw new Error(`Runtime not found at ${binaryPath}. Run installer first.`)
    }

    this.logStream = createWriteStream(runtimeLogPath(), { flags: 'a' })
    this.logStream.write(`\n[${new Date().toISOString()}] Starting locus-runtime...\n`)

    await this.spawn(binaryPath, config)
  }

  private async spawn(binaryPath: string, config: RuntimeLaunchConfig): Promise<void> {
    const args = [
      '-m', config.modelPath,
      '--host', config.host,
      '--port', String(config.port),
      '-c', String(config.nCtx),
      '-ngl', String(config.nGpuLayers),
    ]

    const isWin = process.platform === 'win32'
    const hasSpaces = [binaryPath, ...args].some((a) => a.includes(' '))

    if (isWin && hasSpaces) {
      const escaped = [binaryPath, ...args].map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')
      this.proc = spawn(escaped, [], {
        shell: true, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
      })
    } else {
      this.proc = spawn(binaryPath, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    }

    this.startTime = Date.now()

    this.proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      this.logStream?.write(text)
    })

    this.proc.on('error', (err) => {
      this.logStream?.write(`[ERROR] ${err.message}\n`)
    })

    this.proc.on('exit', (code) => {
      this.logStream?.write(`[${new Date().toISOString()}] Process exited (code ${code})\n`)
      this.proc = null
    })

    return new Promise((resolve) => {
      setTimeout(() => resolve(), 1500)
    })
  }

  async stop(timeoutMs = 10_000): Promise<void> {
    const proc = this.proc
    if (!proc || proc.exitCode !== null) {
      this.proc = null
      this.logStream?.end()
      this.logStream = null
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
    this.logStream?.end()
    this.logStream = null
  }
}

export interface RuntimeLaunchConfig {
  host: string
  port: number
  modelPath: string
  nCtx: number
  nGpuLayers: number
}
