import pc from 'picocolors'
import { loadConfig } from '../config/loader.js'
import { LlamaCppProvider } from '../providers/llamacpp/client.js'
import { checkHealth } from '../providers/llamacpp/health.js'
import { CLI } from '../cli/index.js'

export async function bootstrap(): Promise<void> {
  const config = loadConfig()

  process.stdout.write(pc.dim(`  Connecting to ${config.baseURL} model=${config.model}... `))

  const provider = new LlamaCppProvider(config)

  try {
    const healthy = await checkHealth(config)
    if (!healthy) throw new Error('health check failed')
    process.stdout.write(pc.green('connected\n\n'))
  } catch {
    process.stdout.write(pc.red('failed\n'))
    process.stdout.write(`\n${pc.yellow('Could not reach llama.cpp at ' + config.baseURL)}\n`)
    process.stdout.write(`${pc.dim('Start llama-server, e.g.:')}\n`)
    process.stdout.write(`${pc.dim('  llama-server -m path/to/model.gguf --host 127.0.0.1 --port 8080')}\n`)
    process.exit(1)
  }

  const cli = new CLI(provider)
  await cli.start()
}
