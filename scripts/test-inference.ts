#!/usr/bin/env node
import pc from 'picocolors'
import { InferenceEngine } from '../src/ai/inference.js'
import { LlamaCppProvider } from '../src/providers/llamacpp/client.js'
import { MockProvider } from '../src/providers/mock.js'
import { loadConfig } from '../src/config/loader.js'
import { waitForReady } from '../src/providers/llamacpp/health.js'
import { findBinary, findModel } from '../src/providers/llamacpp/binary.js'

const VERSION = '0.1.0'
const TEST_PROMPT = 'write a python calculator'
const args = process.argv.slice(2)
const useMock = args.includes('--mock')

function printHeader(): void {
  process.stdout.write(pc.cyan(`
  ╔══════════════════════════════════╗
  ║     locus v${VERSION.padEnd(5)}  TEST        ║
  ║     Inference Pipeline Test      ║
  ╚══════════════════════════════════╝
`))
}

async function main(): Promise<void> {
  printHeader()
  process.stdout.write(`  ${pc.dim('Prompt:')}     "${TEST_PROMPT}"\n`)
  process.stdout.write(`  ${pc.dim('Mode:')}       ${useMock ? 'mock (no LLM required)' : 'real llama.cpp'}\n\n`)

  let provider

  if (useMock) {
    process.stdout.write(pc.dim('  Using mock provider... \n'))
    provider = new MockProvider(300)
  } else {
    const config = loadConfig()
    const binaryPath = config.binaryPath || findBinary()
    const modelPath = config.modelPath || findModel()
    const baseUrl = config.baseURL.replace(/\/v1$/, '')

    process.stdout.write(pc.dim(`  Checking ${baseUrl}... `))

    const health = await waitForReady(baseUrl, 10_000)
    if (!health.healthy) {
      process.stdout.write(pc.red('✗ unreachable\n\n'))
      process.stdout.write(pc.yellow('  llama.cpp is not running.\n'))
      process.stdout.write(`  ${pc.dim('Options:')}\n`)
      process.stdout.write(`  ${pc.dim('  • Start llama-server and try again')}\n`)
      process.stdout.write(`  ${pc.dim('  • Run with --mock to test the pipeline without a real LLM')}\n\n`)
      process.exit(1)
    }
    process.stdout.write(pc.green('✓ reachable\n'))

    provider = new LlamaCppProvider(config)
  }

  const inference = new InferenceEngine(provider)

  process.stdout.write(`\n  ${pc.bold('Test 1: Basic inference (non-streaming)')}\n`)
  process.stdout.write(`  ${pc.dim('─'.repeat(50))}\n`)

  const t1Start = Date.now()
  try {
    const result = await inference.chat([{ role: 'user', content: TEST_PROMPT }])
    const t1Elapsed = Date.now() - t1Start
    const preview = result.content?.slice(0, 200) ?? '(empty)'
    process.stdout.write(`  ${pc.green('✓ Response received')} ${pc.dim(`(${t1Elapsed}ms, ${result.content?.length ?? 0} chars)`)}\n`)
    process.stdout.write(`  ${pc.dim('─'.repeat(50))}\n`)
    process.stdout.write(`  ${preview}${(result.content?.length ?? 0) > 200 ? '...' : ''}\n\n`)
  } catch (err: any) {
    process.stdout.write(`  ${pc.red(`✗ Failed: ${err.message}`)}\n\n`)
    process.exit(1)
  }

  process.stdout.write(`  ${pc.bold('Test 2: Streaming inference')}\n`)
  process.stdout.write(`  ${pc.dim('─'.repeat(50))}\n`)

  const t2Start = Date.now()
  let streamedChars = 0

  try {
    const result = await inference.chatStream(
      [{ role: 'user', content: TEST_PROMPT }],
      undefined,
      (token) => {
        streamedChars += token.length
        process.stdout.write(token)
      },
    )
    const t2Elapsed = Date.now() - t2Start
    process.stdout.write(`\n  ${pc.dim('─'.repeat(50))}\n`)
    process.stdout.write(`  ${pc.green('✓ Stream complete')} ${pc.dim(`(${t2Elapsed}ms, ${streamedChars} chars streamed)`)}\n\n`)
  } catch (err: any) {
    process.stdout.write(`\n  ${pc.red(`✗ Failed: ${err.message}`)}\n\n`)
    process.exit(1)
  }

  if (!useMock) {
    process.stdout.write(`  ${pc.bold('Test 3: Pipeline verification (real LLM)')}\n`)
    process.stdout.write(`  ${pc.dim('─'.repeat(50))}\n`)
    const verifyResult = await inference.verify()
    if (!verifyResult.ok) {
      process.stdout.write(`  ${pc.red('✗ Pipeline verification failed')}\n\n`)
      process.exit(1)
    }
  } else {
    process.stdout.write(`  ${pc.dim('Test 3: Skipped (mock provider — real LLM required)')}\n`)
  }

  process.stdout.write(`\n  ${pc.green('✓ All tests passed')}\n`)
  process.stdout.write(`  ${pc.dim('Inference pipeline is working correctly.\n')}\n`)
}

main().catch((err) => {
  process.stderr.write(pc.red(`\nTest error: ${err.message}\n`))
  process.exit(1)
})
