import type { Tool } from '../types.js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

export const editTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'edit',
      description: 'Edit a file via exact string replacement.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to edit' },
          old_string: { type: 'string', description: 'Text to replace (must exist in file)' },
          new_string: { type: 'string', description: 'Replacement text' },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
  },
  handler: async (args) => {
    const filePath = resolve(process.cwd(), args.file_path as string)
    try {
      const content = readFileSync(filePath, 'utf-8')
      if (!content.includes(args.old_string as string)) return 'Error: old_string not found'
      const updated = content.replace(args.old_string as string, args.new_string as string)
      writeFileSync(filePath, updated, 'utf-8')
      return `Applied edit to ${filePath}`
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}
