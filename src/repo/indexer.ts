export class RepoIndexer {
  private index = new Map<string, string[]>()

  add(file: string, tokens: string[]): void {
    this.index.set(file, tokens)
  }

  search(_term: string): string[] {
    return Array.from(this.index.keys())
  }
}
