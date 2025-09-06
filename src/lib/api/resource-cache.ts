// Cache générique avec TTL et déduplication des requêtes concurrentes

export type CacheOptions = { force?: boolean; ttlMs?: number };

type CacheEntry<T> = { data: T; ts: number };

class ResourceCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private defaultTtlMs: number = 10 * 60 * 1000) {}

  get(id: string, fetcher: () => Promise<T>, opts?: CacheOptions): Promise<T> {
    const ttl = opts?.ttlMs ?? this.defaultTtlMs;
    const now = Date.now();

    if (!opts?.force) {
      const cached = this.store.get(id);
      if (cached && now - cached.ts < ttl) {
        return Promise.resolve(cached.data);
      }
    }

    const pending = this.inflight.get(id);
    if (pending) return pending;

    const p = fetcher()
      .then((data) => {
        this.store.set(id, { data, ts: Date.now() });
        return data;
      })
      .finally(() => {
        this.inflight.delete(id);
      });
    this.inflight.set(id, p);
    return p;
  }

  invalidate(id?: string) {
    if (id) {
      this.store.delete(id);
      this.inflight.delete(id);
    } else {
      this.store.clear();
      this.inflight.clear();
    }
  }
}

export function createResourceCache<T>(defaultTtlMs?: number) {
  return new ResourceCache<T>(defaultTtlMs);
}
