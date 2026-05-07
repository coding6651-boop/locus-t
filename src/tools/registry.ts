import type { Tool } from './types.js'
import type { ToolDefinition } from '../llm/interface.js'
import { bashTool } from './bash.js'
import { readTool } from './read.js'
import { writeTool } from './write.js'
import { editTool } from './edit.js'
import { globTool } from './glob.js'

const tools: Tool[] = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globTool,
]

export function getToolDefinitions(): ToolDefinition[] {
  return tools.map((t) => t.definition)
}

export function getTool(name: string): Tool | undefined {
  return tools.find((t) => t.definition.function.name === name)
}
