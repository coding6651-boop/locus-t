import type { Tool } from '../tools/types.js'
import type { ToolDefinition } from '../providers/types.js'

export class TaskRunner {
  async execute(tool: Tool, args: Record<string, unknown>): Promise<string> {
    return tool.handler(args)
  }
}
