import type { Tool } from '../types.js'
import { execSync } from 'child_process'

export const grepTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search file contents using a regex pattern. Uses ripgrep if available, otherwise git grep or fallback.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for' },
          include: { type: 'string', description: 'File glob to filter (e.g. "*.ts")' },
          path: { type: 'string', description: 'Directory to search in (default: cwd)' },
        },
        required: ['pattern'],
      },
    },
  },
  handler: async (args) => {
    const pattern = args.pattern as string
    if (!pattern) return 'Error: no pattern'
    const path = (args.path as string) || '.'
    const include = args.include as string | undefined
    try {
      let cmd = `rg -n "${pattern.replace(/"/g, '\\"')}" "${path}"`
      if (include) cmd += ` -g "${include}"`
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000 })
      return output || '(no matches)'
    } catch (err: any) {
      if (err.status === 1 && !err.stdout && !err.stderr) return '(no matches)'
      return `Error: ${err.message}`
    }
  },
}
