import { BaseProvider } from './provider.js'
import type { LLMConfig, LLMResponse, Message, ToolCall, ToolDefinition } from './types.js'

const MOCK_RESPONSE = `Here's a simple Python calculator:

\`\`\`python
def calculator():
    print("Simple Calculator")
    print("Operations: +, -, *, /")
    
    while True:
        try:
            expr = input("Enter expression (or 'q' to quit): ")
            if expr.lower() == 'q':
                break
            result = eval(expr)
            print(f"= {result}")
        except ZeroDivisionError:
            print("Error: Division by zero")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    calculator()
\`\`\`

This calculator supports basic arithmetic operations. Use it by running \`python calculator.py\`.
`

export class MockProvider extends BaseProvider {
  private delayMs: number
  private fail: boolean

  constructor(delayMs = 500, fail = false) {
    super({ baseURL: 'mock://', model: 'mock-model' })
    this.delayMs = delayMs
    this.fail = fail
  }

  async chat(_messages: Message[], _tools?: ToolDefinition[]): Promise<LLMResponse> {
    if (this.fail) throw new Error('Mock provider: simulated failure')
    await new Promise((r) => setTimeout(r, this.delayMs))
    return { content: MOCK_RESPONSE }
  }

  async chatStream(
    _messages: Message[],
    _tools?: ToolDefinition[],
    onToken?: (token: string) => void,
  ): Promise<LLMResponse> {
    if (this.fail) throw new Error('Mock provider: simulated failure')

    const tokens = MOCK_RESPONSE.split(/(?<=\s)/)
    for (const token of tokens) {
      await new Promise((r) => setTimeout(r, 10))
      onToken?.(token)
    }

    return { content: MOCK_RESPONSE }
  }
}
