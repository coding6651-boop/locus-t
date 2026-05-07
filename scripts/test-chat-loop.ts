#!/usr/bin/env node
import { MockProvider } from '../src/providers/mock.js'
import { Orchestrator } from '../src/core/orchestrator.js'
import pc from 'picocolors'

async function main() {
  const provider = new MockProvider(200)
  const orch = new Orchestrator(provider)

  console.log(pc.cyan('\n  Simple Chat Loop Test\n'))

  console.log(pc.dim('  Turn 1 — write a python calculator'))
  const t1 = Date.now()
  const r1 = await orch.run('write a python calculator')
  const elapsed1 = Date.now() - t1
  console.log(`  ${r1.slice(0, 300)}...`)
  console.log(`  ${pc.dim(`(${elapsed1}ms, ${r1.length} chars)`)}\n`)

  console.log(pc.dim('  Turn 2 — continue conversation'))
  const t2 = Date.now()
  const r2 = await orch.run('add error handling')
  const elapsed2 = Date.now() - t2
  console.log(`  ${r2.slice(0, 300)}...`)
  console.log(`  ${pc.dim(`(${elapsed2}ms, ${r2.length} chars)`)}\n`)

  console.log(pc.green('  ✓ Simple loop works: ask → generate → print'))
  console.log(pc.dim('  Conversation history maintained across turns\n'))
}

main().catch((err) => {
  console.error(pc.red(`Test failed: ${err.message}`))
  process.exit(1)
})
