import pc from 'picocolors'
import { loadConfig } from '../src/config/loader.js'
import { setConfig } from '../src/runtime/state.js'
import { activateLicense } from '../src/auth/activation.js'
import { verifyLicense } from '../src/auth/verification.js'
import * as readline from 'node:readline'

async function main() {
  const token = process.argv[2]

  if (!token) {
    console.log(pc.cyan('  Locus License Activation\n'))
    const existing = await verifyLicense()
    if (existing.ok) {
      console.log(pc.green(`  ✓ Already activated (token: ${existing.license.token})`))
      const answer = await question(`  ${pc.yellow('Reactivate? (y/N): ')}`)
      if (answer.toLowerCase() !== 'y') { process.exit(0) }
    }
    console.log(pc.dim('  Enter your activation token (paste it below):\n'))
    const input = await question(`  ${pc.cyan('Token: ')}`)
    if (!input.trim()) {
      console.log(pc.red('  ✗ No token provided'))
      process.exit(1)
    }
    return runActivation(input.trim())
  }

  return runActivation(token)
}

async function runActivation(token: string) {
  setConfig(loadConfig())

  const result = await activateLicense(token, (s: string) => process.stdout.write(`  ${pc.dim(s)}\n`))

  console.log()
  if (result.ok) {
    console.log(pc.green('  ✓ License activated successfully!'))
    if (result.warnings?.length) {
      for (const w of result.warnings) console.log(pc.yellow(`  ⚠ ${w}`))
    }
    process.exit(0)
  } else {
    console.log(pc.red(`  ✗ Activation failed: ${result.message}`))
    process.exit(1)
  }
}

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(prompt, (answer: string) => { rl.close(); resolve(answer) })
  })
}

main()
