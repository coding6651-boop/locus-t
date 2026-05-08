import { spawn } from 'child_process'
import { writeFileSync } from 'fs'

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
  writeFileSync('test-output.txt', allOutput + `\n=== EXIT: ${code} ===\n`)
  console.log('DONE - written to test-output.txt')
  // Show just the conversation parts, strip ANSI
  const plain = allOutput.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
  const lines = plain.split('\n')
  const conversation = lines.filter(l => 
    l.includes('Hello!') || l.includes('locus >') || l.includes('how') || 
    l.includes('tokenizer') || l.includes('pipeline') || l.includes('Goodbye') ||
    l.includes('src/') || l.includes('Error') || l.includes('exit')
  )
  console.log('=== CONVERSATION ===')
  console.log(conversation.join('\n'))
})

// Send questions with delays
setTimeout(() => { proc.stdin.write('how does the tokenizer work?\n') }, 25000)
setTimeout(() => { proc.stdin.write('/exit\n') }, 70000)
setTimeout(() => { console.log('TIMEOUT'); proc.kill() }, 75000)
