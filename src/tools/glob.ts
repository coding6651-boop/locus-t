import type { Tool } from './types.js'
import { Glob } from 'glob'

export const globTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Search for files matching a glob pattern. Returns matching file paths sorted by modification time.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The glob pattern to match (e.g. "src/**/*.ts", "**/*.json")',
          },
        },
        required: ['pattern'],
      },
    },
  },
  handler: async (args) => {
    const pattern = args.pattern as string
    if (!pattern) return 'Error: no pattern provided'

    try {
      const glob = new Glob(pattern, { cwd: process.cwd() })
      const results: string[] = []
      for await (const entry of glob) {
        results.push(entry)
      }
      if (results.length === 0) return '(no files matched)'
      return results.join('\n')
    } catch (err: any) {
      return `Error globbing: ${err.message}`
    }
  },
}
