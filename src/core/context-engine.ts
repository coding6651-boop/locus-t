import type { Message } from '../providers/types.js'
import { estimateTokens, truncateToTokens } from '../ai/tokenizer.js'

const MAX_CONTEXT_TOKENS = 28000

export class ContextEngine {
  private systemMessage: Message | null = null

  setSystemMessage(msg: Message): void {
    this.systemMessage = msg
  }

  prune(messages: Message[]): Message[] {
    let total = 0
    if (this.systemMessage) total += estimateTokens(this.systemMessage.content ?? '')

    const kept: Message[] = []
    for (const m of messages) {
      const tokens = estimateTokens(m.content ?? '')
      if (total + tokens > MAX_CONTEXT_TOKENS) break
      total += tokens
      kept.push(m)
    }

    if (this.systemMessage) kept.unshift(this.systemMessage)
    return kept
  }

  truncateToolResult(result: string): string {
    return truncateToTokens(result, 500)
  }
}
