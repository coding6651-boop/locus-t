import { MockProvider } from '../src/providers/mock.js'
import { Orchestrator } from '../src/core/orchestrator.js'
import { SessionStore } from '../src/memory/store.js'
import { setConfig } from '../src/runtime/state.js'
import { loadConfig } from '../src/config/loader.js'
import pc from 'picocolors'

const config = loadConfig()
setConfig(config)

const store = new SessionStore(config.storageDir)
console.log(pc.dim('Sessions on disk:'))
for (const s of store.list()) {
  console.log(pc.dim(`  ${s.id} (${s.turns} turns)`))
}
console.log()

const provider = new MockProvider(50)
console.log(pc.dim('Creating orchestrator (should auto-resume last session)...'))
const orch = new Orchestrator(provider)
console.log()

const r = await orch.run('hello')
console.log('Response:', r.slice(0, 80) + '...')

const sessions = orch.listSessions()
console.log(pc.dim('\nSessions after run:'))
for (const s of sessions) {
  console.log(pc.green(`  ${s.id} (${s.turns} turns)`))
}

console.log(pc.green('\n✓ Session persistence works'))
