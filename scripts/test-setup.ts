import { spawn } from 'child_process'
import { createServer } from 'net'
import { writeFileSync } from 'fs'

// Start a mock health server so the CLI boots
const server = createServer((s) => {
  s.on('data', (d) => {
    const req = d.toString()
    if (req.includes('/health')) {
      s.write('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}')
    }
    s.end()
  })
})
server.listen(9999, '127.0.0.1')

const proc = spawn('npx', ['tsx', 'bin/locus.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, COLX_DISABLE_LICENSE_GATE: '1', LOCUS_CLIENT_ONLY: '1', LOCUS_BASE_URL: 'http://127.0.0.1:9999' },
})

let out = ''
proc.stdout.on('data', (d) => { out += d.toString() })
proc.stderr.on('data', (d) => { process.stderr.write(d) })

sendInputs(proc, out)

function sendInputs(proc: any, out: string) {
  setTimeout(() => {
    proc.stdin.write('/setup\n')
  }, 4000)
  setTimeout(() => {
    proc.stdin.write('/exit\n')
  }, 8000)
}

const t = setTimeout(() => {
  proc.kill()
  server.close()
  writeFileSync('setup-test-output.txt', out + '\n=== TIMEOUT ===\n')
  console.log('TIMEOUT')
}, 15000)

proc.on('close', (code) => {
  clearTimeout(t)
  server.close()
  writeFileSync('setup-test-output.txt', out + `\n=== EXIT: ${code} ===\n`)
  console.log(`DONE - exit ${code}`)
})
