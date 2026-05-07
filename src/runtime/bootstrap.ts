import pc from 'picocolors'
import { loadConfig } from '../config/loader.js'
import { setConfig } from './state.js'
import { LlamaCppProvider } from '../providers/llamacpp/client.js'
import { LlamaCppServer } from '../providers/llamacpp/server.js'
import { waitForReady } from '../providers/llamacpp/health.js'
import { findBinary, findModel } from '../providers/llamacpp/binary.js'
import { CLI } from '../cli/index.js'
import { getRAMDetail } from '../system/hardware.js'
import { getCPUDetail } from '../system/cpu.js'
import { getPlatformLabel } from '../system/platform.js'
import { modelsDir } from '../system/paths.js'
import { startLifecycle } from './lifecycle.js'
import { onShutdown } from './shutdown.js'
import type { ServerConfig } from '../providers/llamacpp/types.js'

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
  const binaryPath = config.binaryPath || findBinary()
  const modelPath = config.modelPath || findModel()

  process.stdout.write(`\n${pc.bold('Runtime Diagnostics')}\n`)
  process.stdout.write(`${label}\n`)
  process.stdout.write(`  ${pc.dim('Platform:')}    ${getPlatformLabel()}\n`)
  process.stdout.write(`  ${pc.dim('RAM:')}         ${getRAMDetail()}\n`)
  process.stdout.write(`  ${pc.dim('CPU:')}         ${getCPUDetail()}\n`)
  process.stdout.write(`  ${pc.dim('llama.cpp:')}   ${binaryPath ? pc.green('found') : pc.red('not found')}\n`)
  process.stdout.write(`  ${pc.dim('Model:')}       ${modelPath ? pc.green(modelPath) : pc.yellow('not found')}\n`)
  process.stdout.write(`  ${pc.dim('Endpoint:')}    http://${config.host}:${config.port}/v1\n`)
  process.stdout.write(`${label}\n\n`)
}

function printInstructions(): void {
  process.stdout.write(pc.yellow('\n  No llama.cpp binary or running server found.\n'))
  process.stdout.write(`  ${pc.dim('Options:')}\n`)
  process.stdout.write(`  ${pc.dim('  1. Install llama-server and ensure it\'s in PATH')}\n`)
  process.stdout.write(`  ${pc.dim('  2. Place a .gguf model in ' + modelsDir())}\n`)
  process.stdout.write(`  ${pc.dim('  3. Or set LOCUS_BASE_URL to an already-running server')}\n\n`)
}

export async function bootstrap(): Promise<void> {
  const config = loadConfig()
  setConfig(config)

  printBanner()
  printDiagnostics(config)
  startLifecycle()

  const server = new LlamaCppServer()
  const binaryPath = config.binaryPath || findBinary()
  const modelPath = config.modelPath || findModel()
  let providerBaseUrl = config.baseURL

  if (binaryPath && modelPath) {
    process.stdout.write(pc.dim(`  Starting llama-server... `))

    try {
      await server.start({
        host: config.host,
        port: config.port,
        modelPath,
        binaryPath,
        nCtx: config.nCtx,
        nGpuLayers: config.nGpuLayers,
        verbose: config.verbose,
      } as ServerConfig)
    } catch (err: any) {
      process.stdout.write(pc.red(`✗ failed\n`))
      process.stderr.write(pc.red(`  ${err.message}\n`))
      process.exit(1)
    }

    process.stdout.write(pc.green(`✓ (PID ${server.status?.pid || '?'})\n`))

    process.stdout.write(pc.dim(`  Loading model${pc.dim('.').repeat(3)} `))
    const health = await server.waitForReady(120_000, () => process.stdout.write(pc.dim('.')))
    process.stdout.write('\n')

    if (!health.healthy) {
      process.stdout.write(pc.red(`✗ failed\n`))
      if (health.error) process.stderr.write(pc.red(`  ${health.error}\n`))
      process.exit(1)
    }

    process.stdout.write(pc.green(`  ✓ Model loaded (${health.status.slice(0, 60)})\n\n`))
    providerBaseUrl = `http://${config.host}:${config.port}/v1`
    onShutdown(() => server.stop())
  } else if (process.env.LOCUS_BASE_URL || config.baseURL !== 'http://127.0.0.1:8080/v1') {
    process.stdout.write(pc.dim(`  Connecting to ${config.baseURL}... `))
    const health = await waitForReady(config.baseURL.replace(/\/v1$/, ''), 15_000)
    if (!health.healthy) {
      process.stdout.write(pc.red('✗ unreachable\n'))
      printInstructions()
      process.exit(1)
    }
    process.stdout.write(pc.green('✓ connected\n\n'))
  } else {
    process.stdout.write('\n')
    printInstructions()
    process.exit(1)
  }

  const provider = new LlamaCppProvider({ ...config, baseURL: providerBaseUrl })
  const cli = new CLI(provider)
  await cli.start()
}
