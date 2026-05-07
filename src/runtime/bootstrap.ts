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
import { locusHome, modelsDir } from '../system/paths.js'
import { startLifecycle } from './lifecycle.js'
import { onShutdown } from './shutdown.js'
import { join } from 'path'

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

  const binaryPath = config.binaryPath || findBinary()
  const modelPath = config.modelPath || findModel()
  process.stdout.write(`  ${pc.dim('llama.cpp:')}    ${binaryPath ? pc.green('found') : pc.red('not found')}\n`)
  process.stdout.write(`  ${pc.dim('Model:')}        ${modelPath ? `${config.model} ${pc.dim('(' + modelPath + ')')}` : pc.yellow(config.model)}\n`)

  process.stdout.write(`  ${pc.dim('Endpoint:')}     http://${config.host}:${config.port}/v1\n`)
  process.stdout.write(`  ${pc.dim('Mode:')}         offline\n`)
  process.stdout.write(`${label}\n\n`)
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

  if (binaryPath && modelPath) {
    process.stdout.write(pc.dim(`  Starting llama-server... `))

    await server.start({
      host: config.host,
      port: config.port,
      modelPath,
      binaryPath,
      nCtx: config.nCtx,
      nGpuLayers: config.nGpuLayers,
      verbose: config.verbose,
    })

    process.stdout.write(pc.green(`✓ (PID ${server.status?.pid})\n`))

    process.stdout.write(pc.dim(`  Waiting for model to load... `))
    const health = await waitForReady(`http://${config.host}:${config.port}`, 120_000)
    if (!health.healthy) {
      process.stdout.write(pc.red('✗ failed\n'))
      process.stderr.write(pc.red(`  ${health.error}\n`))
      process.exit(1)
    }
    process.stdout.write(pc.green('✓ ready\n\n'))

    onShutdown(() => server.stop())
  } else {
    process.stdout.write(pc.dim(`  Connecting to ${config.baseURL}... `))

    const health = await waitForReady(config.baseURL.replace(/\/v1$/, ''), 10_000)
    if (!health.healthy) {
      process.stdout.write(pc.red('✗ not reachable\n\n'))
      process.stdout.write(pc.yellow('  No llama.cpp binary or running server found.\n\n'))
      if (!binaryPath) process.stdout.write(`  ${pc.dim('→ Install llama-server and ensure it\'s in PATH')}\n`)
      if (!modelPath) process.stdout.write(`  ${pc.dim('→ Place a .gguf model in ' + modelsDir())}\n`)
      process.stdout.write(`\n  ${pc.dim('Or start llama-server manually and set LOCUS_BASE_URL')}\n`)
      process.exit(1)
    }
    process.stdout.write(pc.green('✓ connected\n\n'))
  }

  const baseURL = binaryPath && modelPath
    ? `http://${config.host}:${config.port}/v1`
    : config.baseURL

  const provider = new LlamaCppProvider({ ...config, baseURL })
  const cli = new CLI(provider)
  await cli.start()
}
