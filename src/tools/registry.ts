import type { Tool } from './types.js'
import { bashTool } from './bash/index.js'
import { readTool, writeTool } from './files/index.js'
import { editTool } from './edit/index.js'
import { globTool } from './search/index.js'
import { grepTool } from './grep/index.js'
import { gitTool } from './git/index.js'
import type { ToolDefinition } from '../providers/types.js'

const tools: Tool[] = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  gitTool,
]

export function getToolDefinitions(): ToolDefinition[] {
  return tools.map((t) => t.definition)
}

export function getTool(name: string): Tool | undefined {
  return tools.find((t) => t.definition.function.name === name)
}
