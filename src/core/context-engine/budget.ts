import type { Message } from '../../providers/types.js'
import { estimateTokens } from '../../ai/tokenizer.js'

export interface TokenBudget {
  system: number
  context: number
  history: number
  response: number
}

const BASE_BUDGET: TokenBudget = {
  system: 1000,
  context: 2000,
  history: 3000,
  response: 1500,
}

export function getBudget(contextWindow: number): TokenBudget {
  const ratio = contextWindow / 8000
  return {
    system: Math.floor(BASE_BUDGET.system * ratio),
    context: Math.floor(BASE_BUDGET.context * ratio),
    history: Math.floor(BASE_BUDGET.history * ratio),
    response: Math.floor(BASE_BUDGET.response * ratio),
  }
}

export function fitToBudget(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text
  const avgCharsPerToken = 4
  const maxChars = maxTokens * avgCharsPerToken
  return text.slice(0, maxChars) + '\n... (truncated to fit budget)'
}

export function trimHistoryToBudget(
  messages: Message[],
  budget: TokenBudget,
  systemMessage: Message | null,
): Message[] {
  let total = 0
  if (systemMessage?.content) total += estimateTokens(systemMessage.content)

  const kept: Message[] = []
  for (const m of messages) {
    const tokens = estimateTokens(m.content ?? '')
    if (total + tokens > budget.history) break
    total += tokens
    kept.push(m)
  }

  return kept
}
