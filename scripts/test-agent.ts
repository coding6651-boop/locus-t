import { spawn } from 'child_process'

const proc = spawn('npx', ['tsx', 'bin/locus.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
})

let stdout = ''
let stderr = ''

proc.stdout.on('data', (d) => { stdout += d.toString() })
proc.stderr.on('data', (d) => { stderr += d.toString() })

proc.on('close', (code) => {
  console.log('EXIT:', code)
  if (stderr.trim()) {
    console.log('\n=== STDERR ===')
    console.log(stderr)
  }
  console.log('\n=== STDOUT ===')
  console.log(stdout)
})

// Model load takes ~15-20s, send first question at 25s
setTimeout(() => { proc.stdin.write('hello\n') }, 25000)

// First response ~30s, send second at 60s
setTimeout(() => { proc.stdin.write('what files are in this project?\n') }, 60000)

// Second response ~30s, exit at 100s
setTimeout(() => { proc.stdin.write('/exit\n') }, 100000)

// Timeout at 120s
setTimeout(() => {
  console.log('\n=== TIMEOUT - killing process ===')
  proc.kill()
}, 120000)
