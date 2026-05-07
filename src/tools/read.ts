import type { Tool } from './types.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export const readTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read the contents of a file at the given path. Returns the file content as text.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or relative path to the file to read',
          },
          offset: {
            type: 'number',
            description: 'Optional line number to start reading from (1-indexed)',
          },
          limit: {
            type: 'number',
            description: 'Optional max number of lines to read',
          },
        },
        required: ['file_path'],
      },
    },
  },
  handler: async (args) => {
    const filePath = resolve(process.cwd(), args.file_path as string)
    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const offset = (args.offset as number) ?? 1
      const limit = args.limit as number | undefined
      const selected = limit ? lines.slice(offset - 1, offset - 1 + limit) : lines.slice(offset - 1)
      const numbered = selected.map((line, i) => `${offset + i}: ${line}`).join('\n')
      return numbered || '(empty file)'
    } catch (err: any) {
      return `Error reading file: ${err.message}`
    }
  },
}
