#!/usr/bin/env node
import { LlamaCppClient } from './llm/llamacpp.js'
import { startCLI } from './cli.js'
import pc from 'picocolors'

const DEFAULT_BASE_URL = 'http://127.0.0.1:8080/v1'
const DEFAULT_MODEL = 'qwen2.5-coder-7b-instruct'

function getConfig() {
  return {
    baseURL: process.env.LOCUS_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.LOCUS_MODEL || DEFAULT_MODEL,
    temperature: parseFloat(process.env.LOCUS_TEMPERATURE || '0.1'),
    maxTokens: parseInt(process.env.LOCUS_MAX_TOKENS || '8192', 10),
  }
}

async function main() {
  const config = getConfig()

  process.stdout.write(pc.dim(`  Connecting to ${config.baseURL} model=${config.model}... `))

  const llm = new LlamaCppClient(config)

  try {
    await llm.chat([{ role: 'user', content: 'ping' }])
    process.stdout.write(pc.green('connected\n\n'))
  } catch {
    process.stdout.write(pc.red('failed\n'))
    process.stdout.write(`\n${pc.yellow('Could not reach llama.cpp at ' + config.baseURL)}\n`)
    process.stdout.write(`${pc.dim('Make sure llama-server is running, e.g.:')}\n`)
    process.stdout.write(`${pc.dim('  llama-server -m path/to/model.gguf --host 127.0.0.1 --port 8080')}\n\n`)
    process.stdout.write(`${pc.dim('You can also set these env vars:')}\n`)
    process.stdout.write(`${pc.dim('  LOCUS_BASE_URL    (default: http://127.0.0.1:8080/v1)')}\n`)
    process.stdout.write(`${pc.dim('  LOCUS_MODEL       (default: qwen2.5-coder-7b-instruct)')}\n`)
    process.stdout.write(`${pc.dim('  LOCUS_TEMPERATURE (default: 0.1)')}\n`)
    process.stdout.write(`${pc.dim('  LOCUS_MAX_TOKENS  (default: 8192)')}\n`)
    process.exit(1)
  }

  await startCLI(llm)
}

main().catch((err) => {
  console.error(pc.red('Fatal error:'), err)
  process.exit(1)
})
