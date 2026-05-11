import pc from 'picocolors'
import { createInterface } from 'readline'
import { homedir } from 'os'
import { join } from 'path'
import { Orchestrator } from '../core/orchestrator.js'
import type { LLMProvider } from '../providers/types.js'
import { RuntimeManager } from '../runtime/manager.js'
import { runtimeBinaryPath, runtimeDir } from '../runtime/paths.js'
import { findModel } from '../providers/llamacpp/binary.js'
import { isRuntimeInstalled } from '../runtime/installer.js'
import { progressBar } from '../ui/progress.js'
import { verifyLicense } from '../auth/verification.js'
import { activateLicense } from '../auth/activation.js'
import { getConfig } from '../runtime/state.js'
import { IndexManager } from '../repo/index-manager.js'
import type { IndexProgress } from '../repo/types.js'

const BANNER = pc.cyan(`
  ╔══════════════════════════════╗
  ║        locus v0.1            ║
  ║   Local AI Coding Terminal   ║
  ╚══════════════════════════════╝
`)

const HELP = `${pc.dim('Commands:')}
  ${pc.green('/help')}       Show help
  ${pc.green('/index')}      Index codebase status and management
  ${pc.green('/index benchmark')} Run index benchmark timings
  ${pc.green('/clear')}      Clear screen
  ${pc.green('/sessions')}   List saved sessions
  ${pc.green('/session <id>')} Resume a session by ID
  ${pc.green('/new')}        Start a new session
  ${pc.green('/setup')}      Download and install llama.cpp runtime
  ${pc.green('/activate')}   Activate license with a token
  ${pc.green('/exit')}       Exit
`

const HELP_LIMITED = `${pc.dim('Commands:')}
  ${pc.green('/activate <token>')} Activate your license
  ${pc.green('/setup')}      Download and install llama.cpp runtime
  ${pc.green('/help')}             Show this help
  ${pc.green('/exit')}             Exit
`

const HELP_UNCONFIGURED = `${pc.dim('Commands:')}
  ${pc.green('/setup')}      Download and install llama.cpp runtime
  ${pc.green('/activate')}   Activate license with a token
  ${pc.green('/help')}       Show this help
  ${pc.green('/exit')}       Exit
`

const ESC_BYTE = 27

function prompt(licensed: boolean, ready: boolean): string {
  const p = 'locus'
  if (!licensed) return pc.yellow(p + ' unlicensed') + pc.dim(' > ')
  if (!ready) return pc.yellow(p + ' notsetup') + pc.dim(' > ')
  return pc.green(p) + pc.dim(' > ')
}

export class CLI {
  private orchestrator: Orchestrator
  private runtime: RuntimeManager | null = null
  private currentAbort: AbortController | null = null
  private licensed = false
  private ready = false
  private indexManager: IndexManager

  constructor(provider: LLMProvider, runtime?: RuntimeManager, ready = false) {
    this.orchestrator = new Orchestrator(provider)
    this.runtime = runtime ?? null
    this.ready = ready
    this.indexManager = new IndexManager()
  }

  async start(): Promise<void> {
    if (getConfig().disableLicenseGate || process.env.LOCUS_DISABLE_LICENSE_GATE === 'true') {
      this.licensed = true
    } else {
      const result = await verifyLicense()
      if (result.ok) {
        this.licensed = true
      } else {
        this.printLicenseError(result.code)
      }
    }

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: prompt(this.licensed, this.ready),
    })

    process.stdout.write(BANNER + '\n')

    if (this.ready) {
      const mode = this.runtime?.isRunning ? 'local' : 'external'
      process.stdout.write(`  ${pc.green('✓ Local AI ready')}  ${pc.dim(`(${mode})\n\n`)}`)
    }

    if (!this.licensed) {
      process.stdout.write(pc.yellow('  License required. Available commands:\n'))
      process.stdout.write(HELP_LIMITED + '\n')
    } else if (!this.ready) {
      process.stdout.write(pc.yellow('  No running runtime. Available commands:\n'))
      process.stdout.write(HELP_UNCONFIGURED + '\n')
    } else {
      process.stdout.write(HELP + '\n')
    }

    if (this.licensed && this.ready) {
      this.autoIndexSilently()
    }

    rl.prompt()

    rl.on('line', async (line: string) => {
      const t = line.trim()
      if (!t) { rl.prompt(); return }

      if (t.startsWith('/')) {
        process.stdout.write('\n')
        await this.handleCommand(t, rl)
        rl.prompt()
        return
      }

      if (!this.licensed) {
        process.stdout.write(pc.yellow('  License required. Only /activate, /setup, and /help are available.\n'))
        rl.prompt()
        return
      }

      if (!this.ready) {
        process.stdout.write(pc.yellow('  No runtime configured. Use /setup to install one, or /help for commands.\n'))
        rl.prompt()
        return
      }

      process.stdout.write('\n')
      rl.pause()
      const ac = new AbortController()
      this.currentAbort = ac

      let escTimer: ReturnType<typeof setTimeout> | null = null
      let escHinted = false

      const showEscHint = () => {
        if (escHinted) return
        escHinted = true
        process.stderr.write(pc.dim('⏎ ESC again within 7s to cancel\n'))
      }

      const clearEscHint = () => {
        if (!escHinted) return
        escHinted = false
        process.stderr.write('\x1b[1A\x1b[2K\r')
      }

      const wasRaw = process.stdin.isRaw
      try { process.stdin.setRawMode(true) } catch { }
      process.stdin.resume()

      const onStdinData = (chunk: Buffer) => {
        if (chunk.length === 1 && chunk[0] === ESC_BYTE) {
          if (!escHinted) {
            showEscHint()
            escTimer = setTimeout(() => { clearEscHint(); escTimer = null }, 7000)
          } else {
            clearEscHint()
            if (escTimer) { clearTimeout(escTimer); escTimer = null }
            ac.abort()
          }
        }
      }

      process.stdin.on('data', onStdinData)

      try {
        process.stdout.write('\n')
        await this.orchestrator.runStream(t, (token) => {
          process.stdout.write(token)
        }, ac.signal)
        clearEscHint()
        process.stdout.write('\n')
      } catch (err: any) {
        clearEscHint()
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          process.stdout.write(pc.yellow('\nInterrupted.\n'))
        } else {
          process.stdout.write(pc.red(`\nError: ${err.message}\n`))
        }
      } finally {
        process.stdin.removeListener('data', onStdinData)
        if (escTimer) { clearTimeout(escTimer); escTimer = null }
        try { process.stdin.setRawMode(wasRaw ?? false) } catch { }
        process.stdin.pause()
        this.currentAbort = null
      }
      rl.prompt()
      rl.resume()
    })

    rl.on('SIGINT', () => {
      if (this.currentAbort) {
        this.currentAbort.abort()
      } else {
        rl.close()
      }
    })

    rl.on('close', () => { process.stdout.write(pc.dim('\nGoodbye!\n')); process.exit(0) })
  }

  private printLicenseError(code: string): void {
    const messages: Record<string, string> = {
      missing: 'No license found.',
      expired: 'Your license has expired.',
      device_mismatch: 'This license is bound to a different device.',
      invalid_signature: 'License verification failed.',
      malformed: 'License file is corrupted.',
    }
    process.stdout.write(pc.yellow(`  ${messages[code] || 'License check failed.'}\n`))
  }

  private async handleCommand(cmd: string, rl: ReturnType<typeof createInterface>): Promise<void> {
    const parts = cmd.split(/\s+/)
    const command = parts[0].toLowerCase()

    if (!this.licensed && command !== '/help' && command !== '/activate' && command !== '/exit' && command !== '/quit' && command !== '/setup') {
      process.stdout.write(pc.yellow('  Not available in unlicensed mode. Use /activate, /setup, or /help.\n'))
      return
    }

    if (!this.ready && this.licensed && command !== '/setup' && command !== '/help' && command !== '/exit' && command !== '/quit' && command !== '/activate' && command !== '/index') {
      process.stdout.write(pc.yellow('  AI features need a running runtime. Use /setup to install one.\n'))
      return
    }

    switch (command) {
      case '/help':
        if (!this.licensed) process.stdout.write(HELP_LIMITED)
        else if (!this.ready) process.stdout.write(HELP_UNCONFIGURED)
        else process.stdout.write(HELP)
        break

      case '/clear':
        if (!this.licensed) {
          process.stdout.write(pc.yellow('  Not available in unlicensed mode. Use /activate or /help.\n'))
          break
        }
        console.clear()
        process.stdout.write(BANNER + '\n')
        break

      case '/new':
        this.orchestrator.newSession()
        break

      case '/index':
        await this.handleIndex(rl, parts[1])
        break

      case '/sessions': {
        const sessions = this.orchestrator.listSessions()
        if (sessions.length === 0) {
          process.stdout.write(pc.dim('No saved sessions.\n'))
        } else {
          process.stdout.write(pc.dim('Saved sessions:\n'))
          for (const s of sessions) {
            const date = new Date(s.createdAt).toLocaleString()
            process.stdout.write(`  ${pc.green(s.id)}  ${date}  ${s.turns} turns\n`)
          }
        }
        break
      }

      case '/session': {
        let sessionId = parts[1]
        if (!sessionId) {
          process.stdout.write(pc.yellow('Usage: /session <id>\n'))
          break
        }
        sessionId = sessionId.replace(/^<|>$/g, '')
        const ok = this.orchestrator.switchSession(sessionId)
        if (!ok) process.stdout.write(pc.red(`Session "${sessionId}" not found.\n`))
        break
      }

      case '/activate':
        await this.handleActivate(parts.slice(1).join(' '), rl)
        break

      case '/setup':
        await this.handleSetup(rl)
        break

      case '/exit':
      case '/quit':
        rl.close()
        break

      default:
        if (command.startsWith('/session') && command !== '/session') {
          const sessionId = command.slice(1)
          return this.handleCommand(`/session ${sessionId}`, rl)
        }
        process.stdout.write(pc.red(`Unknown command: ${command}\n`))
    }
  }

  private async handleSetup(rl?: ReturnType<typeof createInterface>): Promise<void> {
    const mgr = this.runtime ?? new RuntimeManager()

    // ── Check engine state ──
    const engineInstalled = isRuntimeInstalled()
    if (engineInstalled) {
      process.stdout.write(`  Engine:    ${pc.green('✓ already installed')}  ${pc.dim(runtimeBinaryPath())}\n`)
    } else {
      process.stdout.write(`  Engine:    ${pc.yellow('not installed')}\n`)
    }

    // ── Check model state ──
    const modelPath = findModel()
    const modelsDirPath = join(homedir(), '.locus', 'models')
    if (modelPath) {
      const name = modelPath.split(/[/\\]/).pop() ?? modelPath
      process.stdout.write(`  Model:     ${pc.green('✓')} ${name}\n`)
    } else {
      process.stdout.write(`  Model:     ${pc.yellow('not found')}  ${pc.dim(`place a .gguf in ${modelsDirPath}`)}\n`)
    }

    // ── If engine needs install ──
    if (!engineInstalled) {
      if (!mgr.hasManifest) {
        process.stdout.write(pc.red(`\n  ✗ No runtime manifest found. Reinstall locus package.\n\n`))
        return
      }

      process.stdout.write('\n')

      let lastPhase = ''
      const ok = await mgr.downloadAndInstall((phase, fraction) => {
        if (phase === 'connecting') {
          const msg = `  Downloading AI engine... ${pc.dim('connecting...')}`
          process.stdout.write(`\r${msg.padEnd(60)}`)
          lastPhase = phase
        } else if (phase === 'download') {
          const msg = `  Downloading AI engine... ${progressBar(fraction)}`
          process.stdout.write(`\r${msg.padEnd(60)}`)
          lastPhase = phase
        } else if (phase === 'verify') {
          if (lastPhase !== 'verify') {
            process.stdout.write(`\r  Downloading AI engine... ${progressBar(1)}${' '.repeat(10)}\n`)
          }
          process.stdout.write(`\r  Verifying download...   ${progressBar(fraction)}`)
          lastPhase = phase
        } else if (phase === 'extract') {
          process.stdout.write(`\r  Verifying download...   ${progressBar(1)}${' '.repeat(10)}\n`)
          process.stdout.write('  Unpacking runtime...')
          lastPhase = phase
        }
      })

      if (ok && lastPhase === 'extract') {
        process.stdout.write(` ${pc.green('✓')}\n\n`)
      } else if (!ok) {
        process.stdout.write('\n')
        process.stdout.write(pc.yellow('  Could not install runtime automatically.\n'))
        process.stdout.write(pc.dim('  Options:\n'))
        process.stdout.write(pc.dim(`    • Download: ${mgr.hasManifest ? 'retry with /setup' : 'no manifest'}\n`))
        process.stdout.write(pc.dim(`    • Manual:   extract to ${runtimeDir()}\n`))
        process.stdout.write('\n')
        return
      }
    }

    // ── Start engine ──
    const modelPath2 = findModel()
    if (!mgr.isRunning && mgr.isInstalled && modelPath2) {
      process.stdout.write('  Starting local engine... ')
      try {
        const config = getConfig()
        await mgr.start({
          host: config.host,
          port: config.port,
          modelPath: modelPath2,
          nCtx: config.nCtx,
          nGpuLayers: config.nGpuLayers,
        })
        await mgr.waitForReady(120_000)

        await new Promise((r) => setTimeout(r, 2000))
        if (!mgr.isRunning) {
          process.stdout.write(pc.red(`✗\n`))
          process.stdout.write(pc.yellow('  Process exited unexpectedly (possibly blocked by antivirus).\n'))
          process.stdout.write(pc.dim('  Add an exclusion for: ') + runtimeDir() + '\n')
          process.stdout.write(pc.dim('  Or set LOCUS_CLIENT_ONLY=1 and run llama-server manually.\n\n'))
          return
        }

        process.stdout.write(pc.green('✓ Local AI ready\n\n'))
        this.ready = true
        rl?.setPrompt(prompt(this.licensed, this.ready))
      } catch {
        process.stdout.write(pc.red('✗ failed\n'))
        process.stdout.write(pc.dim('  Use LOCUS_BASE_URL to connect to an external server.\n\n'))
      }
    } else if (!modelPath2) {
      process.stdout.write('\n')
      process.stdout.write(pc.yellow('  Model not found. Place a .gguf file and run /setup again.\n'))
      process.stdout.write(pc.dim(`  Expected location: ${join(homedir(), '.locus', 'models')}\n\n`))
    } else if (mgr.isRunning) {
      process.stdout.write(pc.green('  ✓ Local AI ready\n\n'))
      rl?.setPrompt(prompt(this.licensed, this.ready))
    }
  }

  private async handleIndex(rl: ReturnType<typeof createInterface>, mode?: string): Promise<void> {
    const rootPath = process.cwd()
    const mgr = this.indexManager
    if ((mode ?? '').toLowerCase() === 'benchmark') {
      const bench = mgr.benchmark(rootPath)
      process.stdout.write(`  ${pc.bold('Index Benchmark')}\n`)
      process.stdout.write(`  ${pc.dim('scan/build/save/load/query timings')}\n`)
      process.stdout.write(`  Scan:        ${pc.cyan(`${bench.scanMs} ms`)}\n`)
      process.stdout.write(`  Build:       ${pc.cyan(`${bench.buildMs} ms`)}\n`)
      process.stdout.write(`  Save:        ${pc.cyan(`${bench.saveMs} ms`)}\n`)
      process.stdout.write(`  Load:        ${pc.cyan(`${bench.loadMs} ms`)}\n`)
      process.stdout.write(`  First query: ${pc.cyan(`${bench.firstQueryMs} ms`)}\n`)
      process.stdout.write(`  P95 query:   ${pc.cyan(`${bench.p95QueryMs} ms`)}\n`)
      process.stdout.write(`  Manifest:    ${pc.cyan(`${bench.manifestBytes} bytes`)}\n`)
      process.stdout.write(`  Shards:      ${pc.cyan(`${bench.shardsBytes} bytes`)}\n\n`)
      return
    }

    const status = mgr.status(rootPath)

    process.stdout.write(`  ${pc.bold('Locus Index')}\n`)
    process.stdout.write(`  ${pc.dim('─'.repeat(40))}\n`)

    const icon = status.kind === 'current' ? pc.green('●') : status.kind === 'stale' ? pc.yellow('◐') : pc.red('○')
    const label = status.kind === 'current' ? 'Up-to-date' : status.kind === 'stale' ? 'Stale' : 'Not indexed'
    process.stdout.write(`  Status: ${icon} ${label}\n`)

    if (status.meta) {
      process.stdout.write(`  Files:  ${pc.cyan(String(status.fileCount))} indexed\n`)
      process.stdout.write(`  Chunks: ${pc.cyan(String(status.chunkCount))}\n`)
      if (status.lastUpdated) {
        const diff = Date.now() - new Date(status.lastUpdated).getTime()
        const ago = diff < 60000 ? 'just now' : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago` : `${Math.floor(diff / 3600000)}h ago`
        process.stdout.write(`  Last:   ${pc.dim(ago)}\n`)
      }
      const size = status.sizeBytes > 1_000_000
        ? `${(status.sizeBytes / 1_000_000).toFixed(1)} MB`
        : `${(status.sizeBytes / 1000).toFixed(0)} KB`
      process.stdout.write(`  Size:   ${pc.dim(size)}\n`)
    } else {
      const allFiles = mgr.scanFiles(rootPath)
      process.stdout.write(`  Files:  ${pc.cyan(String(allFiles.length))} total\n`)
    }

    process.stdout.write(`  Watch:  ${mgr.isWatching ? pc.green('● Active') : pc.dim('○ Off')}\n`)

    if (status.kind !== 'current') {
      process.stdout.write('\n')
      this.renderIndexProgress({ current: 1, total: 1, file: '' }, true)
      const result = mgr.index(rootPath, (p) => this.renderIndexProgress(p, false))
      this.renderIndexProgress({ current: result.fileCount, total: result.fileCount, file: '' }, true)

      process.stdout.write(`\n  ${pc.green('✓ Indexing complete')}\n`)
      process.stdout.write(`  ${result.fileCount} files | ${result.chunkCount} chunks\n`)

      mgr.startWatcher(rootPath, () => {
        mgr.rebuild(rootPath)
      })
      process.stdout.write(`  ${pc.green('● Watcher active')} ${pc.dim('(auto-rebuilds on file changes)\n')}\n`)
    } else {
      process.stdout.write(`\n  ${pc.dim('Type /index again to force re-index.\n')}\n`)
    }
  }

  private autoIndexSilently(): void {
    const rootPath = process.cwd()
    const mgr = this.indexManager
    const status = mgr.status(rootPath)

    if (status.kind !== 'current') {
      const result = mgr.index(rootPath)
      process.stdout.write(`  ${pc.dim(`Indexed ${result.fileCount} files, ${result.chunkCount} chunks`)}\n`)
    }

    mgr.startWatcher(rootPath, () => {
      mgr.rebuild(rootPath)
    })
  }

  private renderIndexProgress(p: IndexProgress, done: boolean): void {
    if (p.total <= 0) return
    const pct = Math.round((done ? 1 : p.current / p.total) * 100)
    const bar = progressBar(done ? 1 : p.current / p.total)

    if (p.current === 1 && !done) {
      process.stdout.write(`\n`)
    }

    if (!done && p.current > 1) {
      process.stdout.write('\x1b[2A')
    }
    if (done) {
      process.stdout.write(`\r  Indexing: ${bar} 100%\x1b[K\n`)
      process.stdout.write(`  ${pc.dim('File:')} ${''.padEnd(50)}\x1b[K`)
    } else {
      process.stdout.write(`\r  Indexing: ${bar} ${pct}%\x1b[K\n`)
      process.stdout.write(`  ${pc.dim('File:')} ${p.file}\x1b[K`)
      process.stdout.write('\n')
      process.stdout.write('\x1b[1A')
    }
  }

  private async handleActivate(tokenArg: string, rl: ReturnType<typeof createInterface>): Promise<void> {
    let token = tokenArg.trim()

    if (!token) {
      token = await new Promise<string>((resolve) => {
        rl.question(pc.dim('  Activation token: '), (answer) => resolve(answer.trim()))
      })
      if (!token) {
        process.stdout.write(pc.yellow('  No token provided.\n'))
        return
      }
    }

    process.stdout.write('\n')

    const result = await activateLicense(token, (status) => {
      process.stdout.write(`  ${pc.dim(status)}\n`)
    })

    if (result.ok) {
      this.licensed = true
      rl.setPrompt(prompt(true, this.ready))
      process.stdout.write(pc.green('  ✓ License activated successfully!\n'))
      if (result.warnings?.length) {
        for (const w of result.warnings) {
          process.stdout.write(pc.yellow(`  ⚠ ${w}\n`))
        }
      }
      process.stdout.write('\n')
    } else {
      process.stdout.write(pc.red(`  ✗ Activation failed: ${result.message}\n\n`))
    }
  }
}
