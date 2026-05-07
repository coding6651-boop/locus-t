export class RepoSymbols {
  private symbols: Map<string, string[]> = new Map()

  add(file: string, symbols: string[]): void {
    this.symbols.set(file, symbols)
  }

  find(name: string): { file: string; line: number } | null {
    return null
  }
}
