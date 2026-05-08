import type { Message } from '../providers/types.js'
import { buildSystemPrompt } from '../ai/templates.js'

export class PromptBuilder {
  private systemExtra: string | null = null
  private fileContext: string | null = null

  setExtraContext(ctx: string): void {
    this.systemExtra = ctx
  }

  setFileContext(ctx: string): void {
    this.fileContext = ctx || null
  }

  buildSystem(): Message {
    let content = buildSystemPrompt(this.systemExtra ?? undefined)
    if (this.fileContext) {
      content += `\n\nRelevant project files:\n${this.fileContext}`
    }
    return { role: 'system', content }
  }

  buildUser(input: string): Message {
    return { role: 'user', content: input }
  }
}
