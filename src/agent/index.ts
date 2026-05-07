import type { LLMClient, Message } from '../llm/interface.js'
import { getToolDefinitions, getTool } from '../tools/registry.js'
import pc from 'picocolors'

const SYSTEM_PROMPT = `You are locus, an AI coding assistant that lives in the user's terminal.
You have access to tools that let you interact with the file system and run commands.

Available tools:
- bash: Execute shell commands (use this to run code, list files, install packages, etc.)
- read: Read file contents
- write: Write content to a file (creates directories, overwrites existing)
- edit: Make targeted string replacements in existing files
- glob: Search for files matching glob patterns

Rules:
1. Use tools when you need to interact with the workspace. Do not simulate tool results.
2. When you use a tool, wait for the result before proceeding.
3. You can use multiple tools sequentially to complete complex tasks.
4. After completing a task, summarize what you did.
5. When writing code, provide the full file content — do not use placeholders.
6. Keep your responses concise and helpful.`

export class Agent {
  private llm: LLMClient
  private messages: Message[] = []
  private maxIterations = 25

  constructor(llm: LLMClient) {
    this.llm = llm
    this.messages.push({ role: 'system', content: SYSTEM_PROMPT })
  }

  async run(input: string): Promise<string> {
    this.messages.push({ role: 'user', content: input })
    const tools = getToolDefinitions()

    for (let i = 0; i < this.maxIterations; i++) {
      const response = await this.llm.chatStream(this.messages, tools, (token) => {
        process.stdout.write(token)
      })

      if (response.tool_calls && response.tool_calls.length > 0) {
        process.stdout.write('\n')

        this.messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        })

        for (const tc of response.tool_calls) {
          const tool = getTool(tc.function.name)
          if (!tool) {
            this.messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: `Error: unknown tool "${tc.function.name}"`,
            })
            continue
          }

          let args: Record<string, unknown>
          try {
            args = JSON.parse(tc.function.arguments)
          } catch {
            this.messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: `Error: invalid JSON in tool arguments: ${tc.function.arguments}`,
            })
            continue
          }

          process.stdout.write(pc.dim(`  ⚡ ${tc.function.name}(${JSON.stringify(args)})... `))
          const result = await tool.handler(args)
          const truncated = result.length > 2000 ? result.slice(0, 2000) + '\n...(truncated)' : result
          process.stdout.write(pc.dim('done\n'))

          this.messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: truncated,
          })
        }
      } else {
        const content = response.content ?? ''
        this.messages.push({ role: 'assistant', content })
        return content
      }
    }

    return '\nReached maximum iteration limit. Please try again or refine your request.'
  }
}
