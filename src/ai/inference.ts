import type { LLMProvider, LLMResponse, Message, ToolDefinition } from '../providers/types.js'

export class InferenceEngine {
  private provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    return this.provider.chat(messages, tools)
  }

  async chatStream(
    messages: Message[],
    tools?: ToolDefinition[],
    onToken?: (token: string) => void,
  ): Promise<LLMResponse> {
    return this.provider.chatStream(messages, tools, onToken)
  }
}
