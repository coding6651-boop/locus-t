export class MemoryCache<K, V> {
  private store = new Map<K, { value: V; expires: number }>()
  private ttl: number

  constructor(ttlMs = 300_000) {
    this.ttl = ttlMs
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expires) { this.store.delete(key); return undefined }
    return entry.value
  }

  set(key: K, value: V): void {
    this.store.set(key, { value, expires: Date.now() + this.ttl })
  }

  clear(): void { this.store.clear() }
}
