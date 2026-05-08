import OpenAI from 'openai'
import { BaseProvider } from '../provider.js'
import type { LLMConfig, LLMResponse, Message, ToolCall, ToolDefinition } from '../types.js'

export class LlamaCppProvider extends BaseProvider {
  private client: OpenAI

  constructor(config: LLMConfig) {
    super(config)
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: 'not-needed',
    })
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: this.config.model,
      messages: messages as any,
      temperature: this.config.temperature ?? 0.1,
      max_tokens: this.config.maxTokens ?? 8192,
    }
    if (tools?.length) params.tools = tools as any

    const result = await this.client.chat.completions.create(params)
    const choice = result.choices[0]
    if (!choice) return { content: null }

    return {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    }
  }

  async chatStream(
    messages: Message[],
    tools?: ToolDefinition[],
    onToken?: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: this.config.model,
      messages: messages as any,
      temperature: this.config.temperature ?? 0.1,
      max_tokens: this.config.maxTokens ?? 8192,
      stream: true,
    }
    if (tools?.length) params.tools = tools as any

    const stream = await this.client.chat.completions.create(params, { signal })

    let content = ''
    const accs = new Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }>()

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if (!choice) continue

      if (choice.delta.content) {
        content += choice.delta.content
        onToken?.(choice.delta.content)
      }

      if (choice.delta.tool_calls) {
        for (const tc of choice.delta.tool_calls) {
          let acc = accs.get(tc.index)
          if (!acc) {
            acc = { id: '', type: 'function', function: { name: '', arguments: '' } }
            accs.set(tc.index, acc)
          }
          if (tc.id) acc.id = tc.id
          if (tc.function?.name) acc.function.name += tc.function.name
          if (tc.function?.arguments) acc.function.arguments += tc.function.arguments
        }
      }

      if (choice.finish_reason === 'tool_calls') {
        const tool_calls: ToolCall[] = Array.from(accs.values())
          .filter((t) => t.id && t.function.name)
          .map((t) => ({ id: t.id, type: 'function' as const, function: { name: t.function.name, arguments: t.function.arguments } }))
        return { content: content || null, tool_calls: tool_calls.length ? tool_calls : undefined }
      }

      if (choice.finish_reason === 'stop') break
    }

    return { content: content || null }
  }
}
