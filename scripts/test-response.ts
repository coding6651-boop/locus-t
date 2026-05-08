import { spawn } from 'child_process'

const proc = spawn('npx', ['tsx', 'bin/locus.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, COLX_DISABLE_LICENSE_GATE: '1' },
})

let allOutput = ''

proc.stdout.on('data', (d) => { allOutput += d.toString() })
proc.stderr.on('data', (d) => { allOutput += '[STDERR] ' + d.toString() })

proc.on('close', (code) => {
  import('fs').then(({ writeFileSync }) => {
    writeFileSync('test-output.txt', allOutput + `\n=== EXIT: ${code} ===\n`)
    console.log('Done. Full output written to test-output.txt')
  })
})

setTimeout(() => { proc.stdin.write('hello\n') }, 25000)
setTimeout(() => { proc.stdin.write('what files are in this project?\n') }, 65000)
setTimeout(() => { proc.stdin.write('/exit\n') }, 110000)
setTimeout(() => { proc.kill(); console.log('TIMEOUT') }, 120000)
