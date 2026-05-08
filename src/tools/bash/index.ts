import type { Tool } from '../types.js'
import { execSync } from 'child_process'

const BLOCKED_PATTERNS = [
  /^rm\s+-rf\s+\/\s*$/,
  /^dd\s+/,
  /^mkfs\./,
  /^fdisk\s+/,
  /^format\s+/,
  /:\(\)\s*{/,
  /^chmod\s+777\s+/,
  /^chown\s+/,
  /^sudo\s+/,
]

function isDangerous(cmd: string): string | null {
  const trimmed = cmd.trim().toLowerCase()
  if (trimmed.startsWith('rm ')) return 'Use trash instead of rm'
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(trimmed)) return 'This command is blocked for safety'
  }
  return null
}

export const bashTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command in the workspace. Returns stdout + stderr.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
          description: { type: 'string', description: 'Short description of the command' },
        },
        required: ['command'],
      },
    },
  },
  handler: async (args) => {
    const command = args.command as string
    if (!command) return 'Error: no command provided'

    const danger = isDangerous(command)
    if (danger) return `Error: ${danger}`

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        cwd: process.cwd(),
      })
      return output || '(completed with no output)'
    } catch (err: any) {
      return `Exit code: ${err.status}\n${err.stdout || ''}\n${err.stderr || ''}`.trim()
    }
  },
}
