import type { Message } from '../providers/types.js'
import type { InferenceEngine } from '../ai/inference.js'

export interface PipelineEvent {
  type: 'user_input' | 'model_request' | 'tool_call' | 'tool_result' | 'response'
  data: unknown
}

export type PipelineHook = (event: PipelineEvent) => void

export class Pipeline {
  private inference: InferenceEngine
  private hooks: PipelineHook[] = []

  constructor(inference: InferenceEngine) {
    this.inference = inference
  }

  on(hook: PipelineHook): void {
    this.hooks.push(hook)
  }

  private emit(event: PipelineEvent): void {
    for (const hook of this.hooks) hook(event)
  }

  async execute(messages: Message[], input: string): Promise<string> {
    this.emit({ type: 'user_input', data: input })
    // Pipeline delegates to orchestrator; this is the extension point for
    // middleware, logging, validation, etc.
    return ''
  }
}
