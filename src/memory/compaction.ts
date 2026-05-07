import type { Message } from '../providers/types.js'

export function compactMessages(messages: Message[], maxMessages = 50): Message[] {
  if (messages.length <= maxMessages) return messages

  const system = messages.filter((m) => m.role === 'system')
  const rest = messages.filter((m) => m.role !== 'system')

  const kept = rest.slice(-(maxMessages - system.length))
  return [...system, ...kept]
}
