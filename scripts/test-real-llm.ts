import { LlamaCppProvider } from '../src/providers/llamacpp/client.js'
import { Orchestrator } from '../src/core/orchestrator.js'
import { setConfig } from '../src/runtime/state.js'
import { loadConfig } from '../src/config/loader.js'
import pc from 'picocolors'

const config = loadConfig()
setConfig(config)

const provider = new LlamaCppProvider({ ...config, baseURL: 'http://127.0.0.1:8080/v1' })
const orch = new Orchestrator(provider)

console.log(pc.cyan('\n  Testing real LLM inference\n'))
console.log(pc.dim('  Prompt:') + ' write a python fibonacci function\n')

const t1 = Date.now()
const response = await orch.run('write a python fibonacci function')
const elapsed = Date.now() - t1

console.log(response)
console.log(pc.green(`\n  ✓ Response received (${elapsed}ms, ${response.length} chars)\n`))
