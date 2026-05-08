import type { Message } from '../providers/types.js'
import { createSession, type Session } from './session.js'
import { PromptBuilder } from './prompt-builder.js'
import { ContextEngine } from './context-engine.js'
import { InferenceEngine } from '../ai/inference.js'
import { getToolDefinitions, getTool } from '../tools/registry.js'
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
      const last = this.store.last()
      if (last && last.turns > 0) {
        this.session = last
        process.stdout.write(pc.dim(`  Continuing last session ${last.id} (${last.turns} turns)\n`))
      } else {
        this.session = createSession()
      }
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

  async run(input: string): Promise<string> {
    this.session.messages.push(this.promptBuilder.buildUser(input))
    const tools = getToolDefinitions()

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      const response = await this.inference.chat(pruned, tools)

      if (response.tool_calls?.length) {
        this.session.messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        })

        for (const tc of response.tool_calls) {
          const tool = getTool(tc.function.name)
          if (!tool) {
            this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Unknown tool: ${tc.function.name}` })
            continue
          }

          let args: Record<string, unknown>
          try { args = JSON.parse(tc.function.arguments) } catch {
            this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Invalid JSON: ${tc.function.arguments}` })
            continue
          }

          const result = await tool.handler(args)
          const truncated = this.contextEngine.truncateToolResult(result)
          this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: truncated })
        }
      } else {
        const content = response.content ?? ''
        this.session.messages.push({ role: 'assistant', content })
        this.session.turns++
        this.session.updatedAt = new Date().toISOString()
        this.store.save(this.session)
        return content
      }
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
    this.session.messages.push(this.promptBuilder.buildUser(input))
    const tools = getToolDefinitions()

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      const response = await this.inference.chatStream(pruned, tools, onToken, { signal })

      if (response.tool_calls?.length) {
        this.session.messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        })

        for (const tc of response.tool_calls) {
          const tool = getTool(tc.function.name)
          if (!tool) {
            this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Unknown tool: ${tc.function.name}` })
            continue
          }

          let args: Record<string, unknown>
          try { args = JSON.parse(tc.function.arguments) } catch {
            this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Invalid JSON: ${tc.function.arguments}` })
            continue
          }

          const result = await tool.handler(args)
          const truncated = this.contextEngine.truncateToolResult(result)
          this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: truncated })
        }
      } else {
        const content = response.content ?? ''
        this.session.messages.push({ role: 'assistant', content })
        this.session.turns++
        this.session.updatedAt = new Date().toISOString()
        this.store.save(this.session)
        return content
      }
    }

    this.session.updatedAt = new Date().toISOString()
    this.store.save(this.session)
    return '\nReached maximum iteration limit.'
  }

  listSessions(): { id: string; createdAt: string; turns: number }[] {
    return this.store.list()
  }

  reset(): void {
    if (this.session.turns > 0) {
      this.session.updatedAt = new Date().toISOString()
      this.store.save(this.session)
    }
    this.session = createSession()
    this.contextEngine.setSystemMessage(this.promptBuilder.buildSystem())
    process.stdout.write(pc.green('Session reset.\n'))
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
    return true
  }
}
