export class LocusError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocusError'
  }
}

export class LLMConnectionError extends LocusError {
  constructor(baseURL: string, cause?: unknown) {
    super(`Failed to connect to LLM at ${baseURL}`)
    this.name = 'LLMConnectionError'
    this.cause = cause
  }
}

export class ToolExecutionError extends LocusError {
  constructor(toolName: string, message: string) {
    super(`Tool "${toolName}" failed: ${message}`)
    this.name = 'ToolExecutionError'
  }
}

export class MaxIterationsError extends LocusError {
  constructor(limit: number) {
    super(`Reached maximum iteration limit (${limit})`)
    this.name = 'MaxIterationsError'
  }
}
