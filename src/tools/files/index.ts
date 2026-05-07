import type { Tool } from '../types.js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

export const readTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read a file and return its contents with line numbers.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to read' },
          offset: { type: 'number', description: 'Line number to start from (1-indexed)' },
          limit: { type: 'number', description: 'Max number of lines to read' },
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
      return selected.map((line, i) => `${offset + i}: ${line}`).join('\n') || '(empty)'
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}

export const writeTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'write',
      description: 'Write content to a file. Creates parent directories if needed.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to write to' },
          content: { type: 'string', description: 'Full content to write' },
        },
        required: ['file_path', 'content'],
      },
    },
  },
  handler: async (args) => {
    const filePath = resolve(process.cwd(), args.file_path as string)
    try {
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, args.content as string, 'utf-8')
      return `Wrote ${Buffer.byteLength(args.content as string, 'utf-8')} bytes to ${filePath}`
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}
