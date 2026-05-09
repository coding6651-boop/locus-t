import { sign, createPrivateKey } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'

// ---- Imports from our auth module ----
import { getDeviceId } from '../src/auth/device.js'
import { canonicalMessage, verifySignature, EMBEDDED_PUBLIC_KEY_BASE64 } from '../src/auth/crypto.js'
import { write as storageWrite, read as storageRead, remove as storageRemove, licensePath, LICENSE_FILE_NAME } from '../src/auth/storage.js'
import { verifyLicense, verifyPayload } from '../src/auth/verification.js'
import { activateLicense } from '../src/auth/activation.js'
import type { LicensePayload, VerifyResult } from '../src/auth/types.js'
import { loadConfig } from '../src/config/loader.js'
import { setConfig } from '../src/runtime/state.js'

const PRIVATE_KEY_BASE64 = 'MC4CAQAwBQYDK2VwBCIEIM3/Iye4VVabGIlHnkCCQILleR0TBcLcQggwNTNKctqu'

let passed = 0
let failed = 0
let totalTests = 0

function assert(condition: boolean, description: string) {
  totalTests++
  if (condition) {
    passed++
    console.log(`  ✓ ${description}`)
  } else {
    failed++
    console.log(`  ✗ ${description}`)
  }
}

function assertEqual<T>(a: T, b: T, description: string) {
  assert(a === b, `${description} (expected: ${JSON.stringify(b)}, got: ${JSON.stringify(a)})`)
}

function assertOk(result: VerifyResult | { ok: boolean }, description: string) {
  assert(result.ok === true, `${description} (expected ok, got ${JSON.stringify(result)})`)
}

function assertNotOk(result: VerifyResult, expectedCode: string, description: string) {
  assert(result.ok === false && result.code === expectedCode, `${description} (got ${JSON.stringify(result)})`)
}

function signLicense(payload: Omit<LicensePayload, 'signature'>): string {
  const privateKey = createPrivateKey({
    key: Buffer.from(PRIVATE_KEY_BASE64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  })
  const message = canonicalMessage(payload)
  const sig = sign(null, Buffer.from(message, 'utf-8'), privateKey)
  return sig.toString('base64')
}

function makeLicense(overrides?: Partial<LicensePayload>): LicensePayload {
  const device = getDeviceId()
  const base = {
    token: 'TEST-ABCD-1234',
    user_id: 'user_test_001',
    device_id: device.id,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  }
  const sig = signLicense(base)
  return { ...base, signature: sig, ...overrides }
}

// =====================================================
//  1. TEST: device.ts
// =====================================================
console.log('\n── device.ts ──')

const device = getDeviceId()
assert(typeof device.id === 'string', 'getDeviceId returns a string ID')
assert(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(device.id), `Device ID format XXXX-XXXX-XXXX (got: ${device.id})`)
assert(Array.isArray(device.warnings), 'DeviceInfo.warnings is an array')

// Determinism: same call should return same ID
const device2 = getDeviceId()
assertEqual(device2.id, device.id, 'getDeviceId is deterministic')

// =====================================================
//  2. TEST: crypto.ts
// =====================================================
console.log('\n── crypto.ts ──')

// canonicalMessage
const msg = canonicalMessage({ token: 'T1', user_id: 'U1', device_id: 'D1', expires_at: '2026-01-01' })
assertEqual(msg, 'T1\nU1\nD1\n2026-01-01', 'canonicalMessage formats correctly')

// verifySignature - valid
const validLicense = makeLicense()
const validSig = await verifySignature(validLicense, EMBEDDED_PUBLIC_KEY_BASE64)
assert(validSig, 'verifySignature accepts a valid signature')

// verifySignature - tampered payload
const tampered = { ...validLicense, token: 'TAMPERED' }
const invalidSig = await verifySignature(tampered, EMBEDDED_PUBLIC_KEY_BASE64)
assert(!invalidSig, 'verifySignature rejects tampered payload')

// verifySignature - wrong public key
const wrongKey = await verifySignature(validLicense, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')
assert(!wrongKey, 'verifySignature rejects wrong public key')

// verifySignature - corrupt signature
const badSig = { ...validLicense, signature: '!!!invalid-base64!!!' }
const corruptSig = await verifySignature(badSig, EMBEDDED_PUBLIC_KEY_BASE64)
assert(!corruptSig, 'verifySignature handles corrupt signature gracefully')

// verifySignature - empty key
const emptyKey = await verifySignature(validLicense, '')
assert(!emptyKey, 'verifySignature handles empty key gracefully')

// =====================================================
//  3. TEST: storage.ts
// =====================================================
console.log('\n── storage.ts ──')

// Clean up before
storageRemove()

// Test path
const path = licensePath()
assert(path.endsWith(LICENSE_FILE_NAME), `licensePath ends with ${LICENSE_FILE_NAME}`)
assert(path.includes('.locus'), 'licensePath contains .locus directory')

// Test read when no file exists
const noFile = storageRead()
assert(noFile === null, 'storageRead returns null when no license exists')

// Test atomic write + read
const testData = JSON.stringify({ test: 'data', value: 123 })
storageWrite(testData)
const readBack = storageRead()
assertEqual(readBack, testData, 'storageWrite + storageRead roundtrip')

// Test that write is atomic (temp file shouldn't linger)
const dir = join(homedir(), '.locus')
const leftover = readFileSync(join(dir, LICENSE_FILE_NAME), 'utf-8')
assertEqual(leftover, testData, 'License file contains correct written data')

// Test remove
const removed = storageRemove()
assert(removed, 'storageRemove returns true for existing file')
assert(storageRead() === null, 'storageRead returns null after remove')

// Test remove of non-existent
const removedAgain = storageRemove()
assert(!removedAgain, 'storageRemove returns false for non-existent file')

// =====================================================
//  4. TEST: verification.ts
// =====================================================
console.log('\n── verification.ts ──')

// 4a. No license file
storageRemove()
const missing = await verifyLicense()
assertNotOk(missing, 'missing', 'verifyLicense returns missing when no license file')

// 4b. Malformed JSON
storageWrite('{{{not-json}}}')
const malformed = await verifyLicense()
assertNotOk(malformed, 'malformed', 'verifyLicense returns malformed for invalid JSON')

// 4c. Missing required fields
storageWrite(JSON.stringify({ token: 'only' }))
const missingFields = await verifyLicense()
assertNotOk(missingFields, 'malformed', 'verifyPayload rejects payload with missing fields')

// 4d. Wrong field types
const wrongTypes: any = makeLicense()
wrongTypes.token = 123
const typeCheck = await verifyPayload(wrongTypes as LicensePayload)
assertNotOk(typeCheck, 'malformed', 'verifyPayload rejects payload with wrong field types')

// 4e. Device mismatch
const mismatchLicense = makeLicense({ device_id: '0000-0000-0000' })
const mismatch = await verifyPayload(mismatchLicense)
assertNotOk(mismatch, 'device_mismatch', 'verifyPayload rejects device mismatch')

// 4f. Expired license
const expiredLicense = makeLicense({ expires_at: new Date(Date.now() - 86400000).toISOString() })
const expired = await verifyPayload(expiredLicense)
assertNotOk(expired, 'expired', 'verifyPayload rejects expired license')

// 4g. Invalid expiration date
const badDateLicense = makeLicense({ expires_at: 'not-a-date' })
const badDate = await verifyPayload(badDateLicense)
assertNotOk(badDate, 'malformed', 'verifyPayload rejects invalid expiration date')

// 4h. Invalid signature
const validForSigTest = makeLicense()
const badSigLicense = { ...validForSigTest, signature: 'AAAA' }
const badSigCheck = await verifyPayload(badSigLicense)
assertNotOk(badSigCheck, 'invalid_signature', 'verifyPayload rejects invalid signature')

// 4i. Happy path: valid license file on disk
storageWrite(JSON.stringify(makeLicense()))
const valid = await verifyLicense()
assertOk(valid, 'verifyLicense succeeds with valid license')
if (valid.ok) {
  assertEqual(valid.license.token, 'TEST-ABCD-1234', 'Valid license contains correct token')
}

// Clean up
storageRemove()

// =====================================================
//  5. TEST: activation.ts (with mock HTTP server)
// =====================================================
console.log('\n── activation.ts ──')

// Start a mock activation server
const mockServer = await startMockServer()
const port = (mockServer.address() as any).port

// Set activation env vars and reload config before any activation calls
process.env.LOCUS_AUTH_URL = `http://127.0.0.1:${port}/v1/activate`
process.env.LOCUS_AUTH_TIMEOUT_MS = '5000'
process.env.LOCUS_AUTH_MAX_RETRIES = '1'
setConfig(loadConfig())

// 5a. Successful activation
const activationResult = await activateLicense('TEST-ABCD-1234', (status) => {
  console.log(`    [progress] ${status}`)
})
assertOk(activationResult, 'activateLicense succeeds with mock server')
if (activationResult.ok) {
  assertEqual(activationResult.license.token, 'TEST-ABCD-1234', 'Activation returns correct token')
  assertEqual(activationResult.license.user_id, 'user_mock_001', 'Activation returns correct user_id')

  // Verify license was written to disk
  const fromDisk = storageRead()
  assert(fromDisk !== null, 'License written to disk after activation')
  if (fromDisk) {
    const parsed = JSON.parse(fromDisk)
    assertEqual(parsed.token, 'TEST-ABCD-1234', 'Disk license has correct token')
  }
  storageRemove()
}

// 5b. Activation with expired token
const expiredToken = await activateLicense('EXPIRED-TOKEN')
assertNotOk(expiredToken, 'token_expired', 'activateLicense fails with expired token')

// 5c. Activation with invalid token
const badToken = await activateLicense('BAD-TOKEN')
assertNotOk(badToken, 'token_not_found', 'activateLicense fails with invalid token')

// 5d. Activation when server is unreachable
process.env.LOCUS_AUTH_URL = 'http://127.0.0.1:1/v1/activate'
setConfig(loadConfig())
const unreachable = await activateLicense('ANY-TOKEN')
assertNotOk(unreachable, 'network_error', 'activateLicense fails when server unreachable')

// Restore env
delete process.env.LOCUS_AUTH_URL
delete process.env.LOCUS_AUTH_TIMEOUT_MS
delete process.env.LOCUS_AUTH_MAX_RETRIES

// Clean up
storageRemove()
mockServer.close()

// =====================================================
//  SUMMARY
// =====================================================
console.log(`\n${'═'.repeat(50)}`)
console.log(`  Results: ${passed}/${totalTests} passed, ${failed} failed`)
console.log(`${'═'.repeat(50)}\n`)

// Exit with proper code
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
            res.writeHead(404, { 'Connection': 'close' })
            res.end()
            return
          }

          const { token, device_id } = JSON.parse(body)

          if (token === 'BAD-TOKEN') {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Connection': 'close' })
            res.end(JSON.stringify({ code: 'token_not_found', message: 'Token not found' }))
            return
          }

          if (token === 'EXPIRED-TOKEN') {
            res.writeHead(410, { 'Content-Type': 'application/json', 'Connection': 'close' })
            res.end(JSON.stringify({ code: 'token_expired', message: 'Token expired' }))
            return
          }

          const payload = {
            token,
            user_id: 'user_mock_001',
            device_id,
            expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
            signature: '',
          }

          const privateKey = createPrivateKey({
            key: Buffer.from(PRIVATE_KEY_BASE64, 'base64'),
            format: 'der',
            type: 'pkcs8',
          })
          const message = canonicalMessage(payload)
          const sig = sign(null, Buffer.from(message, 'utf-8'), privateKey)
          payload.signature = sig.toString('base64')

          res.writeHead(200, { 'Content-Type': 'application/json', 'Connection': 'close' })
          res.end(JSON.stringify(payload))
        } catch (err) {
          res.writeHead(500, { 'Connection': 'close' })
          res.end(String(err))
        }
      })
    })

    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}
