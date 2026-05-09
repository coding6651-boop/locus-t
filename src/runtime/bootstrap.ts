import pc from 'picocolors'
import { loadConfig } from '../config/loader.js'
import { setConfig } from './state.js'
import { findBinary, findModel } from '../providers/llamacpp/binary.js'
import { RuntimeManager } from './manager.js'
import { runtimeBinaryPath, runtimeDir } from './paths.js'
import { CLI } from '../cli/index.js'
import { startLifecycle } from './lifecycle.js'
import { activateLicense } from '../auth/activation.js'
import { existsSync } from 'fs'

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

  startLifecycle()

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
      }

      if (runtime.isRunning) {
        process.stdout.write(pc.dim(`  Loading model... `))
        const ready = await runtime.waitForReady(120_000)
        if (ready.ok) {
          await new Promise((r) => setTimeout(r, 2000))
          if (!runtime.isRunning) {
            process.stdout.write(pc.red(`✗\n`))
            process.stdout.write(pc.yellow('  Process exited (possibly blocked by antivirus).\n'))
            process.stdout.write(pc.dim('  Add exclusion for: ') + runtimeDir() + '\n')
            process.stdout.write(pc.dim('  Run with LOCUS_CLIENT_ONLY=1 and external server.\n\n'))
          } else {
            process.stdout.write(pc.green('✓\n'))
            providerBaseUrl = `http://${config.host}:${config.port}/v1`
          }
        } else {
          process.stdout.write(pc.red('✗\n'))
        }
      }
    }
  }

  let externalConnected = false
  if (!runtime.isRunning) {
    externalConnected = await runtime.connectToExternal(config.baseURL)
  }

  const ready = runtime.isRunning || externalConnected
  const provider = runtime.createClient({ ...config, baseURL: providerBaseUrl })
  const cli = new CLI(provider, runtime, ready)
  await cli.start()
}
