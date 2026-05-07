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
  ${pc.green('/help')}     Show help
  ${pc.green('/clear')}    Clear screen
  ${pc.green('/exit')}     Exit
  ${pc.green('/reset')}    Reset session
`

export class CLI {
  private orchestrator: Orchestrator

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
        switch (t) {
          case '/help': process.stdout.write(HELP); break
          case '/clear': console.clear(); process.stdout.write(BANNER); break
          case '/exit': case '/quit': rl.close(); return
          case '/reset': this.orchestrator.reset(); process.stdout.write(pc.green('Session reset.\n')); break
          default: process.stdout.write(pc.red(`Unknown: ${t}\n`))
        }
        rl.prompt()
        return
      }

      rl.pause()
      try {
        await this.orchestrator.run(t, (token) => process.stdout.write(token))
        process.stdout.write('\n')
      } catch (err: any) {
        process.stdout.write(pc.red(`\nError: ${err.message}\n`))
      }
      rl.prompt()
      rl.resume()
    })

    rl.on('close', () => { process.stdout.write(pc.dim('\nGoodbye!\n')); process.exit(0) })
  }
}
