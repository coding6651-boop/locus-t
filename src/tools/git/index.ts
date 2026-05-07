import type { Tool } from '../types.js'
import { execSync } from 'child_process'

export const gitTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'git',
      description: 'Run git operations: status, diff, log, add, commit, etc.',
      parameters: {
        type: 'object',
        properties: {
          args: { type: 'string', description: 'Git arguments (e.g. "status", "diff", "log --oneline -5")' },
        },
        required: ['args'],
      },
    },
  },
  handler: async (args) => {
    const gitArgs = args.args as string
    if (!gitArgs) return 'Error: no git args'
    try {
      const output = execSync(`git ${gitArgs}`, { encoding: 'utf-8', timeout: 30000 })
      return output || '(no output)'
    } catch (err: any) {
      return `Git error:\n${err.stderr || err.message}`
    }
  },
}
