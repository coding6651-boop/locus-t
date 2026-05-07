import type { LLMProvider, LLMConfig, LLMResponse, Message, ToolDefinition } from './types.js'

export abstract class BaseProvider implements LLMProvider {
  protected config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
  }

  abstract chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse>
  abstract chatStream(
    messages: Message[],
    tools?: ToolDefinition[],
    onToken?: (token: string) => void,
  ): Promise<LLMResponse>
}
