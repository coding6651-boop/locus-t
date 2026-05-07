import type { Tool } from '../types.js'
import { Glob } from 'glob'

export const globTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Find files matching a glob pattern (e.g. "src/**/*.ts").',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern to match' },
        },
        required: ['pattern'],
      },
    },
  },
  handler: async (args) => {
    const pattern = args.pattern as string
    if (!pattern) return 'Error: no pattern'
    try {
      const g = new Glob(pattern, { cwd: process.cwd() })
      const results: string[] = []
      for await (const entry of g) results.push(entry)
      return results.length ? results.join('\n') : '(no matches)'
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}
