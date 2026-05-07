import type { Message } from '../providers/types.js'

export interface Session {
  id: string
  createdAt: Date
  messages: Message[]
}

let counter = 0

export function createSession(): Session {
  return {
    id: `session_${Date.now()}_${counter++}`,
    createdAt: new Date(),
    messages: [],
  }
}
