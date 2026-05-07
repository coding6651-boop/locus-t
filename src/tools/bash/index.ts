import type { Tool } from '../types.js'
import { execSync } from 'child_process'

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
    try {
      const output = execSync(command, { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 })
      return output || '(completed with no output)'
    } catch (err: any) {
      return `Exit code: ${err.status}\n${err.stdout || ''}\n${err.stderr || ''}`.trim()
    }
  },
}
