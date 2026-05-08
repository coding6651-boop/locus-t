import pc from 'picocolors'
import { createInterface } from 'readline'
import { Orchestrator } from '../core/orchestrator.js'
import type { LLMProvider } from '../providers/types.js'

const BANNER = pc.cyan(`
  ╔══════════════════════════════╗
  ║        locus v0.1            ║
  ║   Local AI Coding Terminal   ║
  ╚══════════════════════════════╝
`)

const HELP = `${pc.dim('Commands:')}
  ${pc.green('/help')}       Show help
  ${pc.green('/clear')}      Clear screen
  ${pc.green('/sessions')}   List saved sessions
  ${pc.green('/session <id>')} Resume a session by ID
  ${pc.green('/new')}        Start a new session
  ${pc.green('/exit')}       Exit
`

const ESC_BYTE = 27

export class CLI {
  private orchestrator: Orchestrator
  private currentAbort: AbortController | null = null

  constructor(provider: LLMProvider) {
    this.orchestrator = new Orchestrator(provider)
  }

  async start(): Promise<void> {
    const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: pc.green('locus') + pc.dim(' > ') })

    process.stdout.write(BANNER)
    process.stdout.write(HELP + '\n')
    rl.prompt()

    rl.on('line', async (line: string) => {
      const t = line.trim()
      if (!t) { rl.prompt(); return }

      if (t.startsWith('/')) {
        await this.handleCommand(t, rl)
        rl.prompt()
        return
      }

      rl.pause()
      const ac = new AbortController()
      this.currentAbort = ac

      let escTimer: ReturnType<typeof setTimeout> | null = null
      let escHinted = false

      const clearEscHint = () => {
        if (!escHinted) return
        escHinted = false
        process.stdout.write('\x1b[1A\x1b[2K\r')
      }

      const wasRaw = process.stdin.isRaw
      try { process.stdin.setRawMode(true) } catch { }
      process.stdin.resume()

      const onStdinData = (chunk: Buffer) => {
        if (chunk.length === 1 && chunk[0] === ESC_BYTE) {
          if (!escHinted) {
            escHinted = true
            process.stdout.write(pc.dim('\n⏎ ESC again within 7s to cancel'))
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

  private async handleCommand(cmd: string, rl: ReturnType<typeof createInterface>): Promise<void> {
    const parts = cmd.split(/\s+/)
    const command = parts[0].toLowerCase()

    switch (command) {
      case '/help':
        process.stdout.write(HELP)
        break

      case '/clear':
        console.clear()
        process.stdout.write(BANNER)
        break

      case '/new':
        this.orchestrator.newSession()
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
}
