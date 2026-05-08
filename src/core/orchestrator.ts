import type { Message } from '../providers/types.js'
import { createSession, type Session } from './session.js'
import { PromptBuilder } from './prompt-builder.js'
import { ContextEngine } from './context-engine/index.js'
import { InferenceEngine } from '../ai/inference.js'
import type { LLMProvider } from '../providers/types.js'
import { SessionStore } from '../memory/store.js'
import { getConfig } from '../runtime/state.js'
import pc from 'picocolors'

export class Orchestrator {
  private session: Session
  private promptBuilder: PromptBuilder
  private contextEngine: ContextEngine
  private inference: InferenceEngine
  private store: SessionStore
  private maxIterations = 25

  constructor(provider: LLMProvider, resumeSessionId?: string) {
    this.store = new SessionStore(getConfig().storageDir)
    this.promptBuilder = new PromptBuilder()
    this.contextEngine = new ContextEngine()
    this.inference = new InferenceEngine(provider)

    if (resumeSessionId) {
      const saved = this.store.load(resumeSessionId)
      if (saved) {
        this.session = saved
        process.stdout.write(pc.dim(`  Resumed session ${saved.id} (${saved.turns} turns)\n`))
      } else {
        process.stdout.write(pc.yellow(`  Session ${resumeSessionId} not found, starting new\n`))
        this.session = createSession()
      }
    } else {
      this.session = createSession()
    }

    this.initSystemMessage()
  }

  private initSystemMessage(): void {
    if (this.session.messages[0]?.role === 'system') {
      this.contextEngine.setSystemMessage(this.session.messages[0])
      this.session.messages.shift()
    } else {
      this.contextEngine.setSystemMessage(this.promptBuilder.buildSystem())
    }
  }

  private async buildContext(input: string): Promise<void> {
    const ctx = await this.contextEngine.selectContext(input)
    this.promptBuilder.setFileContext(ctx)
    const systemMsg = this.promptBuilder.buildSystem()
    this.contextEngine.setSystemMessage(systemMsg)
  }

  async run(input: string): Promise<string> {
    await this.buildContext(input)
    this.session.messages.push(this.promptBuilder.buildUser(input))

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      const response = await this.inference.chat(pruned)

      const content = response.content ?? ''
      this.session.messages.push({ role: 'assistant', content })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      return content
    }

    this.session.updatedAt = new Date().toISOString()
    this.store.save(this.session)
    return '\nReached maximum iteration limit.'
  }

  async runStream(
    input: string,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    await this.buildContext(input)
    this.session.messages.push(this.promptBuilder.buildUser(input))

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      const response = await this.inference.chatStream(pruned, undefined, onToken, { signal })

      const content = response.content ?? ''
      this.session.messages.push({ role: 'assistant', content })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      return content
    }

    this.session.updatedAt = new Date().toISOString()
    this.store.save(this.session)
    return '\nReached maximum iteration limit.'
  }

  listSessions(): { id: string; createdAt: string; turns: number }[] {
    return this.store.list()
  }

  newSession(): void {
    if (this.session.turns > 0) {
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
    }
    this.session = createSession()
    this.contextEngine.setSystemMessage(this.promptBuilder.buildSystem())
    process.stdout.write(pc.green(`New session started: ${this.session.id}\n`))
  }

  switchSession(sessionId: string): boolean {
    const saved = this.store.load(sessionId)
    if (!saved) return false
    if (this.session.turns > 0) {
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
    }
    this.session = saved
    this.initSystemMessage()
    process.stdout.write(pc.green(`Switched to session ${sessionId} (${saved.turns} turns)\n`))
    this.printConversation()
    return true
  }

  private printConversation(): void {
    const exchanges: { user: string; assistant: string }[] = []
    let current: { user: string; assistant: string } | null = null

    for (const m of this.session.messages) {
      if (m.role === 'user') {
        if (!current) current = { user: '', assistant: '' }
        current.user = m.content ?? ''
      } else if (m.role === 'assistant' && current) {
        current.assistant = m.content ?? ''
        exchanges.push(current)
        current = null
      }
    }

    if (exchanges.length === 0) {
      process.stdout.write(pc.dim('  (empty conversation)\n'))
      return
    }

    if (exchanges.length > 5) {
      process.stdout.write(pc.dim(`  ${exchanges.length - 5} earlier exchanges...\n`))
    }

    const slice = exchanges.length > 5 ? exchanges.slice(-5) : exchanges

    for (const e of slice) {
      const userPreview = e.user.length > 70 ? e.user.slice(0, 70) + '...' : e.user
      process.stdout.write(`  ${pc.cyan('Q:')} ${userPreview}\n`)
      if (e.assistant) {
        const asstPreview = e.assistant.length > 80 ? e.assistant.slice(0, 80) + '...' : e.assistant
        process.stdout.write(`  ${pc.green('A:')} ${asstPreview}\n`)
      }
    }
    process.stdout.write('\n')
  }
}
