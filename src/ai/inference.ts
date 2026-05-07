import pc from 'picocolors'
import type { LLMProvider, LLMResponse, Message, ToolDefinition } from '../providers/types.js'

export interface InferenceOptions {
  retries?: number
  timeoutMs?: number
}

const DEFAULT_OPTIONS: Required<InferenceOptions> = {
  retries: 2,
  timeoutMs: 120_000,
}

export class InferenceEngine {
  private provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  async chat(
    messages: Message[],
    tools?: ToolDefinition[],
    options?: InferenceOptions,
  ): Promise<LLMResponse> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let lastErr: Error | null = null

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs)

        try {
          const result = await this.provider.chat(messages, tools)
          return result
        } finally {
          clearTimeout(timer)
        }
      } catch (err: any) {
        lastErr = err
        if (attempt < opts.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }

    throw new Error(`Inference failed after ${opts.retries + 1} attempts: ${lastErr?.message}`)
  }

  async chatStream(
    messages: Message[],
    tools?: ToolDefinition[],
    onToken?: (token: string) => void,
    options?: InferenceOptions,
  ): Promise<LLMResponse> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let lastErr: Error | null = null

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs)

        try {
          const result = await this.provider.chatStream(messages, tools, onToken)
          return result
        } finally {
          clearTimeout(timer)
        }
      } catch (err: any) {
        lastErr = err
        if (attempt < opts.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }

    throw new Error(`Stream failed after ${opts.retries + 1} attempts: ${lastErr?.message}`)
  }

  async verify(modelName?: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now()
    const ping: Message[] = [
      { role: 'user', content: 'Respond with exactly: "ok"' },
    ]

    try {
      const result = await this.chat(ping, undefined, { retries: 1, timeoutMs: 30_000 })
      const latency = Date.now() - start
      const ok = result.content?.includes('ok') ?? false

      if (ok) {
        process.stdout.write(pc.green(`  ✓ ${modelName ?? 'llama.cpp'} responded in ${latency}ms\n`))
      } else {
        process.stdout.write(pc.yellow(`  ⚠ responded in ${latency}ms but content unexpected: "${result.content?.slice(0, 50)}"\n`))
      }

      return { ok, latencyMs: latency }
    } catch (err: any) {
      const latency = Date.now() - start
      process.stdout.write(pc.red(`  ✗ ${err.message}\n`))
      return { ok: false, latencyMs: latency, error: err.message }
    }
  }
}
