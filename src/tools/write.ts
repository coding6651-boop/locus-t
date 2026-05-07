import type { Tool } from './types.js'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

export const writeTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'write',
      description: 'Write content to a file. Creates parent directories if needed. Overwrites existing files.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or relative path to write to',
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file',
          },
        },
        required: ['file_path', 'content'],
      },
    },
  },
  handler: async (args) => {
    const filePath = resolve(process.cwd(), args.file_path as string)
    const content = args.content as string
    try {
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, content, 'utf-8')
      return `Successfully wrote ${Buffer.byteLength(content, 'utf-8')} bytes to ${filePath}`
    } catch (err: any) {
      return `Error writing file: ${err.message}`
    }
  },
}
