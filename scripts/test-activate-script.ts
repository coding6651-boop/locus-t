import { createServer } from 'node:http'
import { createPrivateKey, sign } from 'node:crypto'
import { remove, read } from '../src/auth/storage.js'
import { setConfig } from '../src/runtime/state.js'
import { loadConfig } from '../src/config/loader.js'
import { activateLicense } from '../src/auth/activation.js'

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

const PRIVATE_KEY_BASE64 = 'MC4CAQAwBQYDK2VwBCIEIM3/Iye4VVabGIlHnkCCQILleR0TBcLcQggwNTNKctqu'
const key = createPrivateKey({ key: Buffer.from(PRIVATE_KEY_BASE64, 'base64'), format: 'der', type: 'pkcs8' })

// Start mock activation server
const server = createServer((req, res) => {
  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    const { token, device_id } = JSON.parse(body)
    const expires_at = new Date(Date.now() + 86400000).toISOString()
    const canonical = `${token}\nuser_npm_001\n${device_id}\n${expires_at}`
    const signature = sign(null, Buffer.from(canonical), key).toString('base64')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ token, user_id: 'user_npm_001', device_id, expires_at, signature }))
  })
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const port = (server.address() as any).port
const authUrl = `http://127.0.0.1:${port}/v1/activate`

// Set env for activation
process.env.LOCUS_AUTH_URL = authUrl
process.env.LOCUS_AUTH_TIMEOUT_MS = '5000'
process.env.LOCUS_AUTH_MAX_RETRIES = '1'

// =====================================================
console.log('\n── npm run activate <token> (non-interactive path) ──')

remove()
setConfig(loadConfig())

const out: string[] = []
const onProgress = (s: string) => out.push(s)

const result = await activateLicense('TEST-ACTIVATE', onProgress)
assert(result.ok, `activateLicense succeeded (got: ${result.ok})`)
assertEqual(result.license!.token, 'TEST-ACTIVATE', 'Token matches')
assertEqual(result.license!.user_id, 'user_npm_001', 'User ID matches')

const fromDisk = read()
assert(fromDisk !== null, 'License file written to disk')
if (fromDisk) {
  const parsed = JSON.parse(fromDisk)
  assertEqual(parsed.token, 'TEST-ACTIVATE', 'Disk license token matches')
}

// =====================================================
console.log('\n── npm run activate detects existing activation ──')

// Should still exist from previous step
const existResult = await activateLicense('TEST-ACTIVATE-2', onProgress)
assert(existResult.ok, 'Second activation succeeds (overwrites)')
assertEqual(existResult.license!.token, 'TEST-ACTIVATE-2', 'Token updated')
const disk2 = read()
assert(disk2 !== null, 'License file updated')
if (disk2) {
  assertEqual(JSON.parse(disk2).token, 'TEST-ACTIVATE-2', 'Disk license updated')
}

// =====================================================
console.log('\n── npm run activate with bad token ──')

const badServer = createServer((req, res) => {
  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'token_not_found', message: 'Token not found' }))
  })
})
await new Promise<void>(resolve => badServer.listen(0, '127.0.0.1', resolve))
const badPort = (badServer.address() as any).port
process.env.LOCUS_AUTH_URL = `http://127.0.0.1:${badPort}/v1/activate`

remove()
const badResult = await activateLicense('BAD-TOKEN', onProgress)
assert(!badResult.ok, 'Bad token fails')
assert(badResult.message.includes('Token not found'), `Error message mentions token not found (got: ${badResult.message})`)

// =====================================================
console.log('\n── package.json has activate script ──')

import { readFileSync } from 'node:fs'
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
assert(typeof pkg.scripts.activate === 'string', 'package.json has "activate" script')
assert(pkg.scripts.activate.includes('activate.ts'), 'Script points to scripts/activate.ts')

// =====================================================
//  Cleanup
// =====================================================
delete process.env.LOCUS_AUTH_URL
delete process.env.LOCUS_AUTH_TIMEOUT_MS
delete process.env.LOCUS_AUTH_MAX_RETRIES
server.close()
badServer.close()
remove()

console.log(`\n${'═'.repeat(50)}`)
console.log(`  Results: ${passed}/${totalTests} passed, ${failed} failed`)
console.log(`${'═'.repeat(50)}\n`)
process.exit(failed > 0 ? 1 : 0)
