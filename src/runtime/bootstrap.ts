import pc from 'picocolors'
import { loadConfig } from '../config/loader.js'
import { setConfig } from './state.js'
import { findBinary, findModel } from '../providers/llamacpp/binary.js'
import { RuntimeManager } from './manager.js'
import { runtimeBinaryPath } from './paths.js'
import { CLI } from '../cli/index.js'
import { getRAMDetail } from '../system/hardware.js'
import { getCPUDetail } from '../system/cpu.js'
import { getPlatformLabel } from '../system/platform.js'
import { modelsDir } from '../system/paths.js'
import { startLifecycle } from './lifecycle.js'
import { verifyLicense } from '../auth/verification.js'
import { activateLicense } from '../auth/activation.js'
import type { VerifyResult } from '../auth/types.js'
import { existsSync } from 'fs'

const VERSION = '0.1.0'

const LICENSE_LABELS: Record<string, string> = {
  missing: 'not found',
  expired: 'expired',
  device_mismatch: 'device mismatch',
  invalid_signature: 'invalid signature',
  malformed: 'corrupted',
}

function printBanner(): void {
  process.stdout.write(pc.cyan(`
  ╔══════════════════════════════════╗
  ║        locus v${VERSION.padEnd(5)}               ║
  ║   Local AI Coding Terminal       ║
  ╚══════════════════════════════════╝
`))
}

function printDiagnostics(config: ReturnType<typeof loadConfig>, licenseLabel: string): void {
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
  process.stdout.write(`  ${pc.dim('License:')}     ${licenseLabel}\n`)
  process.stdout.write(`${label}\n\n`)
}

function licenseLabel(config: ReturnType<typeof loadConfig>, result: VerifyResult | null): string {
  if (config.disableLicenseGate) return pc.yellow('gate disabled')
  if (result?.ok) return pc.green('✓ active')
  const code = result?.code || 'missing'
  return pc.red('✗ ' + (LICENSE_LABELS[code] || code))
}

function printInstructions(): void {
  process.stdout.write(pc.yellow('\n  No llama.cpp binary or running server found.\n'))
  process.stdout.write(`  ${pc.dim('Options:')}\n`)
  process.stdout.write(`  ${pc.dim('  1. Install llama-server and ensure it\'s in PATH')}\n`)
  process.stdout.write(`  ${pc.dim('  2. Place a .gguf model in ' + modelsDir())}\n`)
  process.stdout.write(`  ${pc.dim('  3. Set LOCUS_BASE_URL to an already-running server')}\n`)
  process.stdout.write(`  ${pc.dim('  4. Set LOCUS_CLIENT_ONLY=1 to skip local server management')}\n\n`)
}

function printBlockedBinaryGuide(binaryPath: string): void {
  const dir = binaryPath.includes('\\') ? binaryPath.split('\\').slice(0, -1).join('\\') : '.'
  process.stdout.write(pc.yellow(`\n  The binary at ${binaryPath} was blocked by your system.\n`))
  process.stdout.write(`  ${pc.dim('This is usually caused by:')}\n`)
  process.stdout.write(`  ${pc.dim('  • Windows Device Guard / Windows Defender Application Control')}\n`)
  process.stdout.write(`  ${pc.dim('  • Group Policy or organizational security policy')}\n`)
  process.stdout.write(`  ${pc.dim('  • Antivirus flagging the binary as untrusted')}\n`)
  process.stdout.write(`\n`)
  process.stdout.write(`  ${pc.dim('Solutions:')}\n`)
  process.stdout.write(`  ${pc.dim('  1. Run llama-server separately (outside locus):')}\n`)
  process.stdout.write(`  ${pc.dim('     Set LOCUS_CLIENT_ONLY=1 and start the server manually')}\n`)
  process.stdout.write(`  ${pc.dim('  2. Add an exclusion in Windows Security for:')}\n`)
  process.stdout.write(`  ${pc.dim('     ' + dir)}\n`)
  process.stdout.write(`  ${pc.dim('  3. Use a different backend (e.g., Ollama) and set LOCUS_BASE_URL')}\n`)
  process.stdout.write(`  ${pc.dim('  4. Run in WSL where Device Guard does not apply')}\n\n`)
}

function printActivationInstructions(): void {
  process.stdout.write(pc.yellow('\n  No valid license found.\n'))
  process.stdout.write(`  ${pc.dim('Options:')}\n`)
  process.stdout.write(`  ${pc.dim('  1. Run /activate <token> inside the terminal to activate')}\n`)
  process.stdout.write(`  ${pc.dim('  2. Or run:  locus activate <token>')}\n`)
  process.stdout.write(`  ${pc.dim('  3. Or run:  npm run activate')}\n`)
  process.stdout.write(`  ${pc.dim('  4. Set LOCUS_DISABLE_LICENSE_GATE=true to bypass (dev only)')}\n\n`)
}

async function handleCliActivate(): Promise<void> {
  const args = process.argv.slice(2)
  const idx = args.indexOf('activate')
  const token = idx + 1 < args.length ? args[idx + 1] : ''

  if (!token) {
    console.log(pc.yellow('  Usage: locus activate <token>'))
    process.exit(1)
  }

  setConfig(loadConfig())

  const result = await activateLicense(token, (s: string) => process.stdout.write(`  ${pc.dim(s)}\n`))
  if (result.ok) {
    console.log(pc.green('  ✓ License activated successfully!'))
    if (result.warnings?.length) {
      for (const w of result.warnings) console.log(pc.yellow(`  ⚠ ${w}`))
    }
  } else {
    console.log(pc.red(`  ✗ Activation failed: ${result.message}`))
    process.exit(1)
  }

  process.exit(0)
}

export async function bootstrap(): Promise<void> {
  if (process.argv.slice(2).includes('activate')) {
    return handleCliActivate()
  }

  const config = loadConfig()
  setConfig(config)

  const licenseResult = config.disableLicenseGate ? null : await verifyLicense()

  printBanner()
  printDiagnostics(config, licenseLabel(config, licenseResult))
  startLifecycle()

  if (!config.disableLicenseGate && licenseResult && !licenseResult.ok) {
    printActivationInstructions()
    process.exit(1)
  }

  const runtime = new RuntimeManager()
  const binaryPath = findBinary()
  const modelPath = config.modelPath || findModel()
  let providerBaseUrl = config.baseURL
  const clientOnly = !!(process.env.LOCUS_CLIENT_ONLY)

  if (!clientOnly) {
    const installed = runtime.isInstalled
    if (!installed && binaryPath) {
      await runtime.installFromSource(binaryPath)
    }

    if (runtime.isInstalled && modelPath) {
      process.stdout.write(pc.dim(`  Starting local runtime... `))

      try {
        await runtime.start({
          host: config.host,
          port: config.port,
          modelPath,
          nCtx: config.nCtx,
          nGpuLayers: config.nGpuLayers,
        })

        process.stdout.write(pc.green(`✓ (PID ${runtime.isRunning ? '...' : '?'})\n`))
      } catch (err: any) {
        process.stdout.write(pc.red(`✗ failed\n`))
        if (err.message.includes('blocked') || err.message.toLowerCase().includes('permission')) {
          printBlockedBinaryGuide(runtimeBinaryPath())
        } else {
          process.stderr.write(pc.red(`  ${err.message}\n`))
        }
        process.stdout.write(pc.dim(`  Falling back to external server on ${config.baseURL}...\n\n`))
      }

      if (runtime.isRunning) {
        process.stdout.write(pc.dim(`  Loading model${pc.dim('.').repeat(3)} `))
        const ready = await runtime.waitForReady(120_000, () => process.stdout.write(pc.dim('.')))
        process.stdout.write('\n')

        if (!ready.ok) {
          process.stdout.write(pc.red(`✗ failed\n`))
          if (ready.error) process.stderr.write(pc.red(`  ${ready.error}\n`))
          process.stdout.write(pc.dim(`  Falling back to external server on ${config.baseURL}...\n\n`))
        } else {
          process.stdout.write(pc.green(`  ✓ Model loaded\n\n`))
          providerBaseUrl = `http://${config.host}:${config.port}/v1`
        }
      }
    }
  }

  if (!runtime.isRunning) {
    process.stdout.write(pc.dim(`  Connecting to ${config.baseURL}... `))
    const connected = await runtime.connectToExternal(config.baseURL)
    if (!connected) {
      process.stdout.write(pc.red('✗ unreachable\n'))
      printInstructions()
      process.exit(1)
    }
    process.stdout.write(pc.green('✓ connected\n\n'))
  }

  const provider = runtime.createClient({ ...config, baseURL: providerBaseUrl })
  const cli = new CLI(provider, runtime)
  await cli.start()
}
