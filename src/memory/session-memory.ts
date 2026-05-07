import type { Message } from '../providers/types.js'

export class SessionMemory {
  private messages: Message[] = []

  get(): Message[] {
    return [...this.messages]
  }

  set(msgs: Message[]): void {
    this.messages = [...msgs]
  }

  append(msg: Message): void {
    this.messages.push(msg)
  }

  clear(): void {
    this.messages = []
  }
}
