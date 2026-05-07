import type { ToolDefinition } from '../llm/interface.js'

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>

export interface Tool {
  definition: ToolDefinition
  handler: ToolHandler
}
