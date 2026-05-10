export interface IndexChunk {
  id: string
  filePath: string
  content: string
  startLine: number
  endLine: number
  language: string
  label?: string
}

export interface ScoredChunk {
  chunk: IndexChunk
  score: number
}

export interface InvertedIndexData {
  fingerprint: string
  totalChunks: number
  chunks: IndexChunk[]
  postings: Record<string, { chunkIndex: number; tf: number }[]>
  docCount: number
  avgDocLen: number
}

export interface IndexProgress {
  current: number
  total: number
  file: string
}

export interface IndexMeta {
  fingerprint: string
  fileCount: number
  chunkCount: number
  lastUpdated: string
  sizeBytes: number
}
