import type { Message } from '../providers/types.js'

export interface Session {
  id: string
  createdAt: string
  updatedAt: string
  turns: number
  messages: Message[]
}

let counter = 0

export function createSession(resumeId?: string): Session {
  const now = new Date().toISOString()
  return {
    id: resumeId ?? `session_${Date.now()}_${counter++}`,
    createdAt: now,
    updatedAt: now,
    turns: 0,
    messages: [],
  }
}

export function sessionPreview(session: Session, maxLen = 80): string {
  const lastMsg = [...session.messages].reverse().find((m) => m.role === 'user')
  const preview = lastMsg ? lastMsg.content?.slice(0, maxLen) ?? '(empty)' : '(no messages)'
  const date = new Date(session.updatedAt).toLocaleString()
  return `${session.id}  ${date}  ${session.turns} turns  "${preview}"`
}
