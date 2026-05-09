import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { runtimeBinaryPath } from './paths.js'
import { installFromSource, downloadRuntime, isRuntimeInstalled } from './installer.js'
import { RuntimeLauncher } from './launcher.js'
import { waitForReady } from './health.js'
import { RuntimeClient } from './client.js'
import type { RuntimeManifest } from './types.js'
import type { LLMConfig } from '../providers/types.js'
import { onShutdown } from './shutdown.js'

export class RuntimeManager {
  private launcher: RuntimeLauncher
  private manifest: RuntimeManifest | null = null
  private launcherConfig: {
    host: string
    port: number
    modelPath: string
    nCtx: number
    nGpuLayers: number
  } | null = null

  constructor() {
    this.launcher = new RuntimeLauncher()
    this.manifest = this.loadManifest()
  }

  get isRunning(): boolean {
    return this.launcher.isRunning
  }

  get isInstalled(): boolean {
    return isRuntimeInstalled()
  }

  get hasManifest(): boolean {
    return this.manifest !== null
  }

  async installFromSource(sourceBinary: string): Promise<boolean> {
    if (isRuntimeInstalled()) return true
    process.stdout.write('  Copying existing runtime to AppData... ')
    const ok = await installFromSource(sourceBinary)
    process.stdout.write(ok ? '✓\n' : 'failed\n')
    return ok
  }

  private loadManifest(): RuntimeManifest | null {
    const paths = [
      join(process.cwd(), 'runtime', 'manifest.json'),
      join(process.cwd(), 'node_modules', 'locus', 'runtime', 'manifest.json'),
    ]
    for (const p of paths) {
      try {
        return JSON.parse(readFileSync(p, 'utf-8'))
      } catch { }
    }
    return null
  }

  async downloadAndInstall(): Promise<boolean> {
    if (isRuntimeInstalled()) return true
    if (!this.manifest) {
      process.stderr.write('  No runtime manifest found.\n')
      return false
    }
    return downloadRuntime(this.manifest)
  }

  async start(config: {
    host: string
    port: number
    modelPath: string
    nCtx: number
    nGpuLayers: number
  }): Promise<void> {
    this.launcherConfig = config

    if (!existsSync(runtimeBinaryPath())) {
      throw new Error(
        `Runtime not installed.\n` +
        `  Run with a running server at LOCUS_BASE_URL, or install the runtime first.`
      )
    }

    await this.launcher.start({
      host: config.host,
      port: config.port,
      modelPath: config.modelPath,
      nCtx: config.nCtx,
      nGpuLayers: config.nGpuLayers,
    })

    onShutdown(() => this.stop())
  }

  async waitForReady(timeoutMs = 120_000, onProgress?: () => void): Promise<{ ok: boolean; error?: string }> {
    if (!this.launcherConfig) throw new Error('Runtime not started')

    const baseUrl = `http://${this.launcherConfig.host}:${this.launcherConfig.port}`
    const health = await waitForReady(baseUrl, timeoutMs, () => onProgress?.())

    if (health.healthy) {
      return { ok: true }
    }

    let error = health.error || `Runtime not ready after ${timeoutMs / 1000}s`
    if (health.status === 'unreachable' && !this.isRunning) {
      error = 'Runtime process exited before becoming ready.'
    }

    return { ok: false, error }
  }

  createClient(config: LLMConfig): RuntimeClient {
    return new RuntimeClient(config)
  }

  async connectToExternal(baseUrl: string): Promise<boolean> {
    const healthUrl = baseUrl.replace(/\/v1$/, '')
    try {
      const res = await fetch(healthUrl + '/health', { signal: AbortSignal.timeout(5000) })
      return res.ok
    } catch {
      return false
    }
  }

  async stop(): Promise<void> {
    await this.launcher.stop()
  }
}
