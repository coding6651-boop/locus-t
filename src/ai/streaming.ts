export class StreamHandler {
  private buffer = ''
  private onFlush: (text: string) => void

  constructor(onFlush: (text: string) => void) {
    this.onFlush = onFlush
  }

  append(token: string): void {
    this.buffer += token
    if (token.includes('\n') || this.buffer.length > 100) {
      this.flush()
    }
  }

  flush(): void {
    if (this.buffer) {
      this.onFlush(this.buffer)
      this.buffer = ''
    }
  }
}
