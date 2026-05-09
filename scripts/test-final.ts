import { spawn } from 'child_process'
import { writeFileSync } from 'fs'

const proc = spawn('npx', ['tsx', 'bin/locus.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, COLX_DISABLE_LICENSE_GATE: '1' },
})

let out = ''
let errOut = ''
proc.stdout.on('data', (d) => { out += d.toString() })
proc.stderr.on('data', (d) => { errOut += d.toString() })

setTimeout(() => { proc.stdin.write('/setup\n') }, 4000)
setTimeout(() => { proc.stdin.write('/help\n') }, 7000)
setTimeout(() => { proc.stdin.write('/exit\n') }, 9000)

const t = setTimeout(() => { proc.kill(); writeFileSync('final-test.txt', out + '\nSTDERR:\n' + errOut + '\n=== TIMEOUT ===\n'); console.log('TIMEOUT') }, 15000)

proc.on('close', (code) => {
  clearTimeout(t)
  writeFileSync('final-test.txt', out + '\nSTDERR:\n' + errOut + `\n=== EXIT: ${code} ===\n`)
  console.log(`DONE - exit ${code}`)
})
