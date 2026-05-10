import { RepoIndexer } from './indexer.js'
import type { ScoredChunk } from './types.js'

export class Retrieval {
  private indexer: RepoIndexer

  constructor(indexer: RepoIndexer) {
    this.indexer = indexer
  }

  search(query: string, topK = 6): ScoredChunk[] {
    if (!this.indexer.isBuilt) return []
    return this.indexer.search(query, topK)
  }
}
