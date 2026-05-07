import type { Message } from '../providers/types.js'
import { createSession, type Session } from './session.js'
import { PromptBuilder } from './prompt-builder.js'
import { ContextEngine } from './context-engine.js'
import { InferenceEngine } from '../ai/inference.js'
import { getToolDefinitions, getTool } from '../tools/registry.js'
import { StreamHandler } from '../ai/streaming.js'
import type { LLMProvider } from '../providers/types.js'
import pc from 'picocolors'

export class Orchestrator {
  private session: Session
  private promptBuilder: PromptBuilder
  private contextEngine: ContextEngine
  private inference: InferenceEngine
  private maxIterations = 25

  constructor(provider: LLMProvider) {
    this.session = createSession()
    this.promptBuilder = new PromptBuilder()
    this.contextEngine = new ContextEngine()
    this.inference = new InferenceEngine(provider)

    const systemMsg = this.promptBuilder.buildSystem()
    this.contextEngine.setSystemMessage(systemMsg)
    this.session.messages.push(systemMsg)
  }

  async run(input: string, onToken?: (token: string) => void): Promise<string> {
    this.session.messages.push(this.promptBuilder.buildUser(input))
    const tools = getToolDefinitions()

    for (let i = 0; i < this.maxIterations; i++) {
      const pruned = this.contextEngine.prune(this.session.messages)
      const streamHandler = onToken ? new StreamHandler(onToken) : undefined

      const response = await this.inference.chatStream(pruned, tools, (token) => {
        streamHandler?.append(token)
        onToken?.(token)
      })
      streamHandler?.flush()

      if (response.tool_calls?.length) {
        process.stdout.write('\n')

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

          process.stdout.write(pc.dim(`  ⚡ ${tc.function.name}(${JSON.stringify(args)})... `))
          const result = await tool.handler(args)
          const truncated = this.contextEngine.truncateToolResult(result)
          process.stdout.write(pc.dim('done\n'))

          this.session.messages.push({ role: 'tool', tool_call_id: tc.id, content: truncated })
        }
      } else {
        const content = response.content ?? ''
        this.session.messages.push({ role: 'assistant', content })
        return content
      }
    }

    return '\nReached maximum iteration limit.'
  }

  reset(): void {
    this.session = createSession()
    const systemMsg = this.promptBuilder.buildSystem()
    this.contextEngine.setSystemMessage(systemMsg)
    this.session.messages.push(systemMsg)
  }
}
