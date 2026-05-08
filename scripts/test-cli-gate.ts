import pc from 'picocolors'
import { createPrivateKey, sign } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { canonicalMessage } from '../src/auth/crypto.js'
import { write as storageWrite, remove as storageRemove } from '../src/auth/storage.js'
import { getDeviceId } from '../src/auth/device.js'
import { setConfig } from '../src/runtime/state.js'
import { loadConfig } from '../src/config/loader.js'
import { activateLicense } from '../src/auth/activation.js'
import { verifyLicense, verifyPayload } from '../src/auth/verification.js'
import { CLI } from '../src/cli/index.js'
import type { LicensePayload } from '../src/auth/types.js'
import type { LLMProvider } from '../src/providers/types.js'

const PRIVATE_KEY_BASE64 = 'MC4CAQAwBQYDK2VwBCIEIEFoMeq9Llpv/0TvhO8uUlimCN3IERKkoPqsKStH1feB'

let passed = 0
let failed = 0
let totalTests = 0

function assert(condition: boolean, description: string) {
  totalTests++
  if (condition) { passed++; console.log(`  ✓ ${description}`) }
  else { failed++; console.log(`  ✗ ${description}`) }
}

function assertEqual<T>(a: T, b: T, description: string) {
  assert(a === b, `${description} (expected: ${JSON.stringify(b)}, got: ${JSON.stringify(a)})`)
}

const device = getDeviceId()
const mockProvider: LLMProvider = {
  chat: async () => ({ content: '', tool_calls: [] }),
  chatStream: async () => ({ content: '', tool_calls: [] }),
  verify: async () => true,
}

// =====================================================
//  Test helpers
// =====================================================
function signLicensePayload(p: Omit<LicensePayload, 'signature'>): string {
  const key = createPrivateKey({ key: Buffer.from(PRIVATE_KEY_BASE64, 'base64'), format: 'der', type: 'pkcs8' })
  const sig = sign(null, Buffer.from(canonicalMessage(p), 'utf-8'), key)
  return sig.toString('base64')
}

function makeValidLicense(): LicensePayload {
  const base = { token: 'TEST-ABCD-1234', user_id: 'user_test_001', device_id: device.id, expires_at: new Date(Date.now() + 86400000).toISOString() }
  return { ...base, signature: signLicensePayload(base) }
}

// =====================================================
//  1. CLI command filtering (unlicensed mode)
// =====================================================
console.log('\n── CLI command filtering (unlicensed) ──')

// Clear any existing license
storageRemove()
setConfig(loadConfig())

const cli = new CLI(mockProvider)
const handleCmd = (CLI.prototype as any).handleCommand.bind(cli)

// Mock readline
const mockRl = { question: () => '', close: () => {} } as any

// Unlicensed: only /activate, /help, /exit should be allowed
let output = ''
const origWrite = process.stdout.write
process.stdout.write = ((chunk: any) => { if (typeof chunk === 'string') output += chunk; return true }) as any

await handleCmd('/new', mockRl)
assert(output.includes('Not available'), '/new blocked in unlicensed mode')

output = ''
await handleCmd('/sessions', mockRl)
assert(output.includes('Not available'), '/sessions blocked in unlicensed mode')

output = ''
await handleCmd('/session abc', mockRl)
assert(output.includes('Not available'), '/session blocked in unlicensed mode')

output = ''
await handleCmd('/clear', mockRl)
assert(output.includes('Not available'), '/clear blocked in unlicensed mode')

output = ''
await handleCmd('/help', mockRl)
assert(output.includes('/activate'), '/help shows /activate in unlicensed mode')
assert(output.includes('/exit'), '/help shows /exit in unlicensed mode')
assert(!output.includes('/sessions'), '/help hides licensed commands in unlicensed mode')

process.stdout.write = origWrite

// =====================================================
//  2. CLI command filtering (licensed mode)
// =====================================================
console.log('\n── CLI command filtering (licensed) ──')

// Write a valid license to disk
const lic = makeValidLicense()
storageWrite(JSON.stringify(lic))

const cli2 = new CLI(mockProvider)
const handleCmd2 = (CLI.prototype as any).handleCommand.bind(cli2)

// Force licensed mode
;(cli2 as any).licensed = true

output = ''
await handleCmd2('/sessions', mockRl)
assert(output.includes('No saved sessions') || output.includes('Saved sessions'), '/sessions works in licensed mode')

output = ''
await handleCmd2('/help', mockRl)
assert(output.includes('/sessions'), '/help shows full command list in licensed mode')

// Clean up
storageRemove()

// =====================================================
//  3. bootstrap locus activate <token> via bootstrap handler
// =====================================================
console.log('\n── bootstrap activate handler ──')

const originalExit = process.exit
const originalArgv = process.argv
let exitCode: number | null = null
process.exit = ((code?: number) => { exitCode = code ?? 0; throw new Error(`EXIT:${code}`) }) as any

// Start mock server
const mockServer = await startMockServer()
const port = (mockServer.address() as any).port

// Set env vars for the test
process.env.LOCUS_AUTH_URL = `http://127.0.0.1:${port}/v1/activate`
process.env.LOCUS_AUTH_TIMEOUT_MS = '5000'
process.env.LOCUS_AUTH_MAX_RETRIES = '1'
process.env.LOCUS_DISABLE_LICENSE_GATE = 'true'

// Clean up any existing license
storageRemove()

// Call bootstrap via import
process.argv = ['node', 'locus', 'activate', 'TEST-BOOTSTRAP']
// Dynamically import to get fresh module state
const mod = await import('../src/runtime/bootstrap.js')

try {
  await mod.bootstrap()
} catch (e: any) {
  if (e.message?.startsWith('EXIT:')) {
    // Expected — bootstrap calls process.exit
  } else {
    // Unexpected error — capture it
  }
}

assert(exitCode === 0, 'bootstrap activate exits with code 0 on success')

// Verify license was written
const { read } = await import('../src/auth/storage.js')
const fromDisk = read()
assert(fromDisk !== null, 'License written to disk via bootstrap activate')
if (fromDisk) {
  const parsed = JSON.parse(fromDisk)
  assertEqual(parsed.token, 'TEST-BOOTSTRAP', 'Bootstrap-activated license has correct token')
}

storageRemove()

// Test bootstrap activate without token
exitCode = null
process.argv = ['node', 'locus', 'activate']
try {
  await mod.bootstrap()
} catch (e: any) {
  if (e.message?.startsWith('EXIT:')) {
    // Expected
  }
}
assert(exitCode === 1, 'bootstrap activate without token exits with code 1')

// Cleanup
process.exit = originalExit
process.argv = originalArgv
delete process.env.LOCUS_AUTH_URL
delete process.env.LOCUS_AUTH_TIMEOUT_MS
delete process.env.LOCUS_AUTH_MAX_RETRIES
delete process.env.LOCUS_DISABLE_LICENSE_GATE

mockServer.close()
storageRemove()

// =====================================================
//  SUMMARY
// =====================================================
console.log(`\n${'═'.repeat(50)}`)
console.log(`  Results: ${passed}/${totalTests} passed, ${failed} failed`)
console.log(`${'═'.repeat(50)}\n`)
process.exit(failed > 0 ? 1 : 0)

// =====================================================
//  Helper: mock activation server
// =====================================================
function startMockServer(): Promise<Server> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk })
      req.on('end', () => {
        try {
          if (req.method !== 'POST' || !req.url?.includes('/activate')) {
            res.writeHead(404, { 'Connection': 'close' }); res.end(); return
          }
          const { token, device_id } = JSON.parse(body)
          const payload = {
            token,
            user_id: 'user_mock_001',
            device_id,
            expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
            signature: '',
          }
          payload.signature = signLicensePayload(payload)
          res.writeHead(200, { 'Content-Type': 'application/json', 'Connection': 'close' })
          res.end(JSON.stringify(payload))
        } catch (err) {
          res.writeHead(500, { 'Connection': 'close' }); res.end(String(err))
        }
      })
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}
