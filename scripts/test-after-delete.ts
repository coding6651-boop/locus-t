import { spawn } from 'child_process'
import { writeFileSync } from 'fs'

const proc = spawn('npx', ['tsx', 'bin/locus.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, COLX_DISABLE_LICENSE_GATE: '1' },
})

let out = ''
proc.stdout.on('data', (d) => { out += d.toString() })
proc.stderr.on('data', (d) => { process.stderr.write(d) })

proc.on('close', (code) => {
  writeFileSync('clean-test-output.txt', out + `\n=== EXIT: ${code} ===\n`)
  console.log('\nDONE. Full output in clean-test-output.txt')
})

setTimeout(() => { proc.stdin.write('hello\n') }, 25000)
setTimeout(() => { proc.stdin.write('/exit\n') }, 65000)
setTimeout(() => { proc.kill(); console.log('TIMEOUT') }, 70000)
