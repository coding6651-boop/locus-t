import type { Tool } from '../types.js'
import { readFileSync, writeFileSync, mkdirSync, statSync, openSync, readSync, closeSync } from 'fs'
import { resolve, dirname } from 'path'

const MAX_READ_SIZE = 1_048_576
const MAX_OUTPUT_LINES = 200
const DEFAULT_LIMIT = 200
const BINARY_CHECK_BYTES = 4096

function isBinary(filePath: string): boolean {
  try {
    const fd = openSync(filePath, 'r')
    const buf = Buffer.alloc(BINARY_CHECK_BYTES)
    const bytesRead = readSync(fd, buf, 0, BINARY_CHECK_BYTES, 0)
    closeSync(fd)
    return buf.subarray(0, bytesRead).includes(0)
  } catch {
    return false
  }
}

export const readTool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read a file and return its contents with line numbers. Max file size: 1 MB. Max output: 200 lines.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to read' },
          offset: { type: 'number', description: 'Line number to start from (1-indexed)' },
          limit: { type: 'number', description: 'Max number of lines to read (default 200, max 500)' },
        },
        required: ['file_path'],
      },
    },
  },
  handler: async (args) => {
    const filePath = resolve(process.cwd(), args.file_path as string)

    try {
      const stat = statSync(filePath)
      if (!stat.isFile()) return `Error: '${args.file_path}' is not a file`

      if (stat.size > MAX_READ_SIZE) {
        const mb = (stat.size / 1_048_576).toFixed(1)
        return `Error: File too large (${mb} MB). Maximum read size is 1 MB. Use /grep to search for specific content or read a portion of the file.`
      }

      if (stat.size === 0) return '(empty file)'

      if (isBinary(filePath)) {
        return `Error: '${args.file_path}' appears to be a binary file. Use shell tools to inspect it.`
      }

      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const offset = Math.max(1, (args.offset as number) ?? 1)
      const limit = Math.min(args.limit as number ?? DEFAULT_LIMIT, MAX_OUTPUT_LINES)
      const selected = lines.slice(offset - 1, offset - 1 + limit)

      if (selected.length === 0) return '(empty)'

      let result = selected.map((line, i) => `${offset + i}: ${line}`).join('\n')
      if (selected.length < lines.length - offset + 1) {
        const remaining = lines.length - offset + 1 - selected.length
        result += `\n... (${remaining} more lines — use offset=${offset + limit} to continue)`
      }
      return result
    } catch (err: any) {
      if (err.code === 'ENOENT') return `Error: File not found: '${args.file_path}'`
      if (err.code === 'EACCES') return `Error: Permission denied: '${args.file_path}'`
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
      if (err.code === 'EACCES') return `Error: Permission denied: '${args.file_path}'`
      return `Error: ${err.message}`
    }
  },
}
