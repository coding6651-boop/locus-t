export class Chunker {
  chunk(content: string, maxSize = 1000): string[] {
    const lines = content.split('\n')
    const chunks: string[] = []
    for (let i = 0; i < lines.length; i += maxSize) {
      chunks.push(lines.slice(i, i + maxSize).join('\n'))
    }
    return chunks
  }
}
