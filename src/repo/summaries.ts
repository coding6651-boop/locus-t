export class RepoSummaries {
  private summaries = new Map<string, string>()

  set(file: string, summary: string): void {
    this.summaries.set(file, summary)
  }

  get(file: string): string | undefined {
    return this.summaries.get(file)
  }
}
