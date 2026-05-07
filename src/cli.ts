import pc from 'picocolors'
import { createInterface } from 'readline'
import { Agent } from './agent/index.js'
import type { LLMClient } from './llm/interface.js'

const BANNER = pc.cyan(`
  ╔══════════════════════════════╗
  ║        locus v0.1            ║
  ║   Local AI Coding Terminal   ║
  ╚══════════════════════════════╝
`)

function getPrefix(): string {
  return pc.green('locus') + pc.dim(' > ')
}

const HELP = `${pc.dim('Commands:')}
  ${pc.green('/help')}     Show this help message
  ${pc.green('/clear')}    Clear the conversation
  ${pc.green('/exit')}     Exit locus
  ${pc.green('/reset')}    Reset the agent state
`

export async function startCLI(llm: LLMClient) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPrefix(),
  })

  let agent = new Agent(llm)

  process.stdout.write(BANNER)
  process.stdout.write(HELP)
  process.stdout.write('\n')

  rl.prompt()

  const handleLine = async (line: string) => {
    const trimmed = line.trim()

    if (!trimmed) {
      rl.prompt()
      return
    }

    if (trimmed.startsWith('/')) {
      switch (trimmed) {
        case '/help':
          process.stdout.write(HELP)
          break
        case '/clear':
          console.clear()
          process.stdout.write(BANNER)
          break
        case '/exit':
        case '/quit':
          rl.close()
          return
        case '/reset':
          agent = new Agent(llm)
          process.stdout.write(pc.green('Agent state reset.\n'))
          break
        default:
          process.stdout.write(pc.red(`Unknown command: ${trimmed}\n`))
          process.stdout.write(pc.dim('Type /help for available commands.\n'))
      }
      rl.prompt()
      return
    }

    rl.pause()
    try {
      const response = await agent.run(trimmed)
      if (response) {
        process.stdout.write('\n' + response + '\n')
      }
    } catch (err: any) {
      process.stdout.write(pc.red(`\nError: ${err.message}\n`))
    }
    rl.prompt()
    rl.resume()
  }

  rl.on('line', handleLine)

  rl.on('close', () => {
    process.stdout.write(pc.dim('\nGoodbye!\n'))
    process.exit(0)
  })
}
