import type { Message } from '../providers/types.js'
import { createSession, type Session } from './session.js'
import { PromptBuilder } from './prompt-builder.js'
import { ContextEngine } from './context-engine/index.js'
import { InferenceEngine } from '../ai/inference.js'
import type { LLMProvider } from '../providers/types.js'
import { SessionStore } from '../memory/store.js'
import { ResponseCache } from '../memory/response-cache.js'
import { getConfig } from '../runtime/state.js'
import { isFastPathCandidate, resolveFastPath } from './fast-path.js'
import pc from 'picocolors'
import { ThinkingStatus } from '../ui/thinking-status.js'

export class Orchestrator {
  private session: Session
  private promptBuilder: PromptBuilder
  private contextEngine: ContextEngine
  private inference: InferenceEngine
  private store: SessionStore
  private cache: ResponseCache
  private maxIterations = 25

  constructor(provider: LLMProvider, resumeSessionId?: string) {
    this.store = new SessionStore(getConfig().storageDir)
    this.promptBuilder = new PromptBuilder()
    this.contextEngine = new ContextEngine(getConfig().nCtx ?? 8192)
    this.inference = new InferenceEngine(provider)
    this.cache = new ResponseCache()

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

  private async buildContext(input: string, onStage?: (stage: import('../repo/types.js').ThinkingStage) => void): Promise<void> {
    const ctx = await this.contextEngine.selectContext(input, undefined, (evt) => onStage?.(evt.stage))
    this.promptBuilder.setFileContext(ctx)
    const systemMsg = this.promptBuilder.buildSystem()
    this.contextEngine.setSystemMessage(systemMsg)
  }

  private async tryCached(input: string, fingerprint: string, onToken?: (token: string) => void, signal?: AbortSignal): Promise<string | null> {
    const cached = this.cache.get(input, fingerprint)
    if (!cached) return null

    if (onToken) {
      const tokens = cached.split(/(?=\s)/)
      for (const t of tokens) {
        if (signal?.aborted) break
        onToken(t)
        await new Promise((r) => setTimeout(r, 8))
      }
    }

    return cached
  }

  async run(input: string): Promise<string> {
    if (isFastPathCandidate(input)) {
      const allFiles = this.contextEngine.getAllFiles()
      const fastResult = resolveFastPath(input, allFiles)
      if (fastResult !== null) {
        this.session.messages.push({ role: 'user', content: input })
        this.session.messages.push({ role: 'assistant', content: fastResult })
        this.session.turns++
        this.session.updatedAt = new Date().toISOString()
        this.store.save(this.session)
        return fastResult
      }
    }

    const fingerprint = this.contextEngine.getProjectFingerprint()

    const projectCached = await this.tryCached(input, fingerprint)
    if (projectCached !== null) {
      this.session.messages.push({ role: 'user', content: input })
      this.session.messages.push({ role: 'assistant', content: projectCached })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      return projectCached
    }

    const sharedCached = await this.tryCached(input, '')
    if (sharedCached !== null) {
      this.session.messages.push({ role: 'user', content: input })
      this.session.messages.push({ role: 'assistant', content: sharedCached })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      return sharedCached
    }

    if (needsCodeContext(input)) {
      await this.buildContext(input)
    } else {
      this.promptBuilder.setFileContext('')
      const systemMsg = this.promptBuilder.buildSystem()
      this.contextEngine.setSystemMessage(systemMsg)
    }
    this.session.messages.push(this.promptBuilder.buildUser(input))

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      const response = await this.inference.chat(pruned)

      const content = response.content ?? ''
      this.session.messages.push({ role: 'assistant', content })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      const tier = this.promptBuilder.hasFileContext() ? fingerprint : ''
      this.cache.set(input, tier, content)
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
    if (isFastPathCandidate(input)) {
      const allFiles = this.contextEngine.getAllFiles()
      const fastResult = resolveFastPath(input, allFiles)
      if (fastResult !== null) {
        if (onToken) {
          const tokens = fastResult.split(/(?=\s)/)
          for (const t of tokens) {
            if (signal?.aborted) break
            onToken(t)
            await new Promise((r) => setTimeout(r, 8))
          }
        }
        this.session.messages.push({ role: 'user', content: input })
        this.session.messages.push({ role: 'assistant', content: fastResult })
        this.session.turns++
        this.session.updatedAt = new Date().toISOString()
        this.store.save(this.session)
        return fastResult
      }
    }

    const fingerprint = this.contextEngine.getProjectFingerprint()

    const projectCached = await this.tryCached(input, fingerprint, onToken, signal)
    if (projectCached !== null) {
      this.session.messages.push({ role: 'user', content: input })
      this.session.messages.push({ role: 'assistant', content: projectCached })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      return projectCached
    }

    const sharedCached = await this.tryCached(input, '', onToken, signal)
    if (sharedCached !== null) {
      this.session.messages.push({ role: 'user', content: input })
      this.session.messages.push({ role: 'assistant', content: sharedCached })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      return sharedCached
    }

    const status = new ThinkingStatus()
    if (needsCodeContext(input)) {
      status.start('Scanning project')
      await this.buildContext(input, (stage) => status.update(stage))
    } else {
      this.promptBuilder.setFileContext('')
      const systemMsg = this.promptBuilder.buildSystem()
      this.contextEngine.setSystemMessage(systemMsg)
      status.start('Thinking')
    }
    this.session.messages.push(this.promptBuilder.buildUser(input))

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      status.update('Generating response')
      let firstToken = true
      let accumulated = ''
      const repAbort = new AbortController()
      const onAbort = () => repAbort.abort()
      signal?.addEventListener('abort', onAbort, { once: true })

      const wrappedOnToken = (token: string) => {
        if (firstToken) {
          firstToken = false
          status.stop()
        }
        accumulated += token
        if (detectRepetition(accumulated)) {
          repAbort.abort()
          return
        }
        onToken?.(token)
      }

      try {
        await this.inference.chatStream(pruned, undefined, wrappedOnToken, { signal: repAbort.signal })
      } catch (err: any) {
        if (err.name === 'AbortError' && signal?.aborted) throw err
      } finally {
        signal?.removeEventListener('abort', onAbort)
      }

      if (firstToken) status.stop()

      const content = trimRepeatedTail(accumulated)
      this.session.messages.push({ role: 'assistant', content })
      this.session.turns++
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
      const tier = this.promptBuilder.hasFileContext() ? fingerprint : ''
      this.cache.set(input, tier, content)
      return content
    }
    status.stop()

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

const CODE_SIGNALS = [
  /\b(file|function|class|module|import|export|variable|method|type|interface|error|bug|fix|refactor|test|lint|build|compile)\b/i,
  /\b(src|lib|config|package|component|endpoint|route|api|database|schema|migration)\b/i,
  /\b(where\s+is|show\s+me|find|locate|create|add|remove|update|change|rename|move|delete)\b/i,
  /\b(how\s+to|implement|write|code|debug|deploy|install|setup|configure)\b/i,
  /[./\\][\w-]+\.(ts|js|py|rs|go|java|json|yaml|md|css|html|tsx|jsx)\b/,
  /`[^`]+`/,
]

function needsCodeContext(input: string): boolean {
  return CODE_SIGNALS.some(p => p.test(input))
}

const REP_WINDOW = 60
const REP_MIN_LEN = 200

function detectRepetition(text: string): boolean {
  if (text.length < REP_MIN_LEN) return false
  const tail = text.slice(-REP_WINDOW)
  const searchIn = text.slice(0, -REP_WINDOW)
  if (searchIn.length < REP_WINDOW) return false
  let count = 0
  let pos = 0
  while ((pos = searchIn.indexOf(tail, pos)) !== -1) {
    count++
    if (count >= 2) return true
    pos++
  }
  return false
}

function trimRepeatedTail(text: string): string {
  if (text.length < REP_MIN_LEN) return text
  for (let w = 30; w <= 120; w++) {
    const tail = text.slice(-w)
    const idx = text.lastIndexOf(tail, text.length - w - 1)
    if (idx !== -1 && idx > 0) {
      return text.slice(0, idx + w).trimEnd()
    }
  }
  return text
}
