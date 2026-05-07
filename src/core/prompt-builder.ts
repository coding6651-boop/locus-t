import type { Message } from '../providers/types.js'
import { buildSystemPrompt } from '../ai/templates.js'

export class PromptBuilder {
  private systemExtra: string | null = null

  setExtraContext(ctx: string): void {
    this.systemExtra = ctx
  }

  buildSystem(): Message {
    return { role: 'system', content: buildSystemPrompt(this.systemExtra ?? undefined) }
  }

  buildUser(input: string): Message {
    return { role: 'user', content: input }
  }
}
