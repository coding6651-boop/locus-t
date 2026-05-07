import type { Tool } from './types.js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

export const editTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'edit',
      description: 'Edit a file by performing exact string replacements. Used to make targeted changes to existing files.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or relative path to the file to edit',
          },
          old_string: {
            type: 'string',
            description: 'The exact text to replace (must exist in the file)',
          },
          new_string: {
            type: 'string',
            description: 'The new text to insert in place of old_string',
          },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
  },
  handler: async (args) => {
    const filePath = resolve(process.cwd(), args.file_path as string)
    const oldStr = args.old_string as string
    const newStr = args.new_string as string

    try {
      const content = readFileSync(filePath, 'utf-8')
      if (!content.includes(oldStr)) {
        return `Error: old_string not found in file.`
      }
      const updated = content.replace(oldStr, newStr)
      if (updated === content) {
        return `Error: nothing was replaced (old_string matched but replace produced no change).`
      }
      writeFileSync(filePath, updated, 'utf-8')
      return `Successfully applied edit to ${filePath}`
    } catch (err: any) {
      return `Error editing file: ${err.message}`
    }
  },
}
