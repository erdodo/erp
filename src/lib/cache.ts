// Client-only (browser). All functions guard against SSR with typeof window check.
import Dexie, { type Table } from "dexie";

// ─── Schema ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  id?:       number;
  key:       string;
  data:      unknown;
  expiresAt: number;
  updatedAt: number;
}

interface SyncQueueEntry {
  id?:       number;
  url:       string;
  method:    string;
  body:      string | null;
  headers:   Record<string, string>;
  createdAt: number;
  retries:   number;
}

// ─── DB ────────────────────────────────────────────────────────────────────────

class ErpCacheDB extends Dexie {
  cache!:     Table<CacheEntry>;
  syncQueue!: Table<SyncQueueEntry>;

  constructor() {
    super("erp-cache-v1");
    this.version(1).stores({
      cache:     "++id, key, expiresAt",
      syncQueue: "++id, createdAt",
    });
  }
}

let _db: ErpCacheDB | null = null;
function db(): ErpCacheDB {
  if (!_db) _db = new ErpCacheDB();
  return _db;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

// ─── Cache API ─────────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  try {
    const entry = await db().cache.where("key").equals(key).first();
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      await db().cache.where("key").equals(key).delete();
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttl = DEFAULT_TTL): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await db().cache.where("key").equals(key).delete();
    await db().cache.add({ key, data, expiresAt: Date.now() + ttl, updatedAt: Date.now() });
  } catch {}
}

export async function cacheInvalidate(keyPrefix: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const entries = await db().cache.filter((e) => e.key.startsWith(keyPrefix)).toArray();
    await db().cache.bulkDelete(entries.map((e) => e.id!));
  } catch {}
}

export async function cacheFlushExpired(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const now     = Date.now();
    const expired = await db().cache.filter((e) => e.expiresAt < now).toArray();
    await db().cache.bulkDelete(expired.map((e) => e.id!));
  } catch {}
}

/**
 * Fetch with IndexedDB cache.
 * - On cache hit (non-expired) returns cached value.
 * - On miss fetches from network, caches the result.
 * @param key   Cache key (usually the URL + params)
 * @param fetcher Async function that returns the data
 * @param ttl   TTL in ms (default 5 min)
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(key, data, ttl);
  return data;
}

// ─── Sync Queue API ────────────────────────────────────────────────────────────

export async function addToSyncQueue(opts: {
  url:      string;
  method:   string;
  body?:    unknown;
  headers?: Record<string, string>;
}): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await db().syncQueue.add({
      url:       opts.url,
      method:    opts.method,
      body:      opts.body !== undefined ? JSON.stringify(opts.body) : null,
      headers:   opts.headers ?? { "Content-Type": "application/json" },
      createdAt: Date.now(),
      retries:   0,
    });
  } catch {}
}

export async function getSyncQueueCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try { return db().syncQueue.count(); } catch { return 0; }
}

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  if (typeof window === "undefined") return { success: 0, failed: 0 };
  const d       = db();
  const pending = await d.syncQueue.orderBy("createdAt").toArray();
  let success   = 0;
  let failed    = 0;

  for (const entry of pending) {
    try {
      const res = await fetch(entry.url, {
        method:  entry.method,
        headers: entry.headers,
        body:    entry.body ?? undefined,
      });
      if (res.ok) {
        await d.syncQueue.delete(entry.id!);
        success++;
      } else {
        await d.syncQueue.update(entry.id!, { retries: entry.retries + 1 });
        failed++;
      }
    } catch {
      await d.syncQueue.update(entry.id!, { retries: entry.retries + 1 });
      failed++;
    }
  }

  // Remove entries that have failed too many times
  const maxRetries = 5;
  const deadItems  = await d.syncQueue.filter((e) => e.retries >= maxRetries).toArray();
  await d.syncQueue.bulkDelete(deadItems.map((e) => e.id!));

  return { success, failed };
}

export async function clearSyncQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  await db().syncQueue.clear();
}
