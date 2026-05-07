import OpenAI from 'openai'
import type {
  LLMClient,
  LLMConfig,
  LLMResponse,
  Message,
  ToolCall,
  ToolDefinition,
} from './interface.js'

export class LlamaCppClient implements LLMClient {
  private client: OpenAI
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: 'not-needed',
    })
    this.model = config.model
    this.temperature = config.temperature ?? 0.1
    this.maxTokens = config.maxTokens ?? 4096
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: messages as any,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    }

    if (tools && tools.length > 0) {
      params.tools = tools as any
    }

    const result = await this.client.chat.completions.create(params)
    const choice = result.choices[0]

    if (!choice) {
      return { content: null }
    }

    const message = choice.message

    return {
      content: message.content,
      tool_calls: message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    }
  }

  async chatStream(
    messages: Message[],
    tools?: ToolDefinition[],
    onToken?: (token: string) => void,
  ): Promise<LLMResponse> {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: this.model,
      messages: messages as any,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true,
    }

    if (tools && tools.length > 0) {
      params.tools = tools as any
    }

    const stream = await this.client.chat.completions.create(params)

    let content = ''
    const toolCallAccumulators: Map<number, {
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }> = new Map()

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if (!choice) continue

      const delta = choice.delta

      if (delta.content) {
        content += delta.content
        onToken?.(delta.content)
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index
          let acc = toolCallAccumulators.get(index)

          if (!acc) {
            acc = {
              id: tc.id ?? '',
              type: 'function',
              function: { name: '', arguments: '' },
            }
            toolCallAccumulators.set(index, acc)
          }

          if (tc.id) acc.id = tc.id
          if (tc.function?.name) acc.function.name += tc.function.name
          if (tc.function?.arguments) acc.function.arguments += tc.function.arguments
        }
      }

      if (choice.finish_reason === 'tool_calls') {
        const tool_calls: ToolCall[] = Array.from(toolCallAccumulators.values())
          .filter((tc) => tc.id && tc.function.name)
          .map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }))

        return {
          content: content || null,
          tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
        }
      }
    }

    return { content: content || null }
  }
}
