import type { Tool } from './types.js'
import { execSync } from 'child_process'

export const bashTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command in the workspace directory. Returns stdout + stderr. Use this to run code, install packages, list files, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          description: {
            type: 'string',
            description: 'A short description of what this command does',
          },
        },
        required: ['command'],
      },
    },
  },
  handler: async (args) => {
    const command = args.command as string
    if (!command) return 'Error: no command provided'

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      })
      return output || '(command completed with no output)'
    } catch (err: any) {
      const stderr = err.stderr || ''
      const stdout = err.stdout || ''
      return `Exit code: ${err.status}\n${stdout}\n${stderr}`.trim()
    }
  },
}
