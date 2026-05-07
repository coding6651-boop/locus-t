export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface LLMConfig {
  baseURL: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface LLMResponse {
  content: string | null
  tool_calls?: ToolCall[]
}

export interface LLMClient {
  chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse>
  chatStream(
    messages: Message[],
    tools?: ToolDefinition[],
    onToken?: (token: string) => void,
  ): Promise<LLMResponse>
}
