import pc from 'picocolors'
import { loadConfig } from '../config/loader.js'
import { setConfig } from './state.js'
import { LlamaCppProvider } from '../providers/llamacpp/client.js'
import { checkHealth } from '../providers/llamacpp/health.js'
import { CLI } from '../cli/index.js'
import { getRAMDetail } from '../system/hardware.js'
import { getCPUDetail } from '../system/cpu.js'
import { getPlatformLabel } from '../system/platform.js'
import { locusHome } from '../system/paths.js'
import { startLifecycle } from './lifecycle.js'

const VERSION = '0.1.0'

function printBanner(): void {
  process.stdout.write(pc.cyan(`
  ╔══════════════════════════════════╗
  ║        locus v${VERSION.padEnd(5)}               ║
  ║   Local AI Coding Terminal       ║
  ╚══════════════════════════════════╝
`))
}

function printDiagnostics(config: ReturnType<typeof loadConfig>): void {
  const label = pc.dim('─'.repeat(50))

  process.stdout.write(`\n${pc.bold('Runtime Diagnostics')}\n`)
  process.stdout.write(`${label}\n`)
  process.stdout.write(`  ${pc.dim('Platform:')}    ${getPlatformLabel()}\n`)
  process.stdout.write(`  ${pc.dim('RAM:')}         ${getRAMDetail()}\n`)
  process.stdout.write(`  ${pc.dim('CPU:')}         ${getCPUDetail()}\n`)
  process.stdout.write(`  ${pc.dim('Storage:')}     ${config.storageDir}\n`)
  process.stdout.write(`  ${pc.dim('Config:')}      ${config.baseURL}\n`)
  process.stdout.write(`  ${pc.dim('Model:')}       ${config.model}\n`)
  process.stdout.write(`  ${pc.dim('Mode:')}        offline\n`)
  process.stdout.write(`${label}\n\n`)
}

export async function bootstrap(): Promise<void> {
  const config = loadConfig()
  setConfig(config)

  printBanner()
  printDiagnostics(config)

  startLifecycle()

  process.stdout.write(pc.dim(`  Connecting to ${config.baseURL} `))

  const provider = new LlamaCppProvider(config)

  try {
    const healthy = await checkHealth(config)
    if (!healthy) throw new Error('health check failed')
    process.stdout.write(pc.green('✓ connected\n\n'))
  } catch {
    process.stdout.write(pc.red('✗ failed\n'))
    process.stdout.write(`\n${pc.yellow('  llama.cpp is not reachable at ' + config.baseURL)}\n\n`)
    process.stdout.write(`  Make sure llama-server is running:\n`)
    process.stdout.write(`  ${pc.dim('  llama-server -m ' + config.model.replace('qwen2.5-coder-7b-instruct', '<model.gguf>') + ' --host 127.0.0.1 --port 8080')}\n\n`)
    process.stdout.write(`  ${pc.dim('Or set LOCUS_BASE_URL to your running endpoint')}\n`)
    process.exit(1)
  }

  const cli = new CLI(provider)
  await cli.start()
}
