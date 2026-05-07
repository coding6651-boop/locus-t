import type { ToolDefinition } from '../providers/types.js'

export interface Tool {
  definition: ToolDefinition
  handler: (args: Record<string, unknown>) => Promise<string>
}
