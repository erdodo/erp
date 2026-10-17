import Redis from "ioredis";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // Kalan saniye (0 ise izin verildi)
  current?: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export interface FailureLimiter {
  isLimited(key: string): Promise<boolean>;
  retryAfter(key: string): Promise<number>;
  recordFailure(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  windowSeconds: number;
}

interface InMemoryEntry {
  count: number;
  resetAt: number;
}

// ─── Redis Singleton & Connection Management ─────────────────────────────────

let redisInstance: Redis | null = null;
let redisDisabled = false;

export function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisDisabled) {
    return null;
  }

  if (redisInstance) {
    return redisInstance;
  }

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn("[RateLimit] Redis baglantisi kurulamadi, gecici olarak bellek-ici limitere donuluyor.");
          return null; // Don't retry indefinitely
        }
        return Math.min(times * 100, 1000);
      },
    });

    client.on("error", (err: Error) => {
      console.warn("[RateLimit] Redis baglanti hatasi:", err.message);
    });

    redisInstance = client;
    return client;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[RateLimit] Redis baslatilamadi, bellek-ici mod kullaniliyor:", msg);
    return null;
  }
}

/** Test veya acil durumlar icin Redis ornegini sifirlar/kapatir */
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    }
    redisInstance = null;
  }
}

// ─── Lua Scripts (Atomic INCR + EXPIRE) ──────────────────────────────────────

// Eger anahtar yeni olusturuluyorsa (current == 1), PEXPIRE ile pencere suresi atanir.
// Mevcut TTL ve anlik sayac dondurulur.
const INCR_EXPIRE_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

// ─── In-Memory Fallback Store ────────────────────────────────────────────────

class InMemoryStore {
  private store = new Map<string, InMemoryEntry>();

  private prune(now: number) {
    if (this.store.size < 5000) return;
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) this.store.delete(key);
    }
  }

  check(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.prune(now);

    const entry = this.store.get(key);
    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0, current: 1 };
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return { allowed: false, retryAfter, current: entry.count };
    }

    entry.count += 1;
    return { allowed: true, retryAfter: 0, current: entry.count };
  }

  recordFailure(key: string, windowMs: number): void {
    const now = Date.now();
    this.prune(now);

    const entry = this.store.get(key);
    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
    }
  }

  retryAfter(key: string, maxFailures: number): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    const now = Date.now();
    if (entry.resetAt <= now) {
      this.store.delete(key);
      return 0;
    }
    return entry.count >= maxFailures ? Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) : 0;
  }

  isLimited(key: string, maxFailures: number): boolean {
    return this.retryAfter(key, maxFailures) > 0;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// ─── Factory: createRateLimiter ──────────────────────────────────────────────

export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  prefix: string = "rl:rate"
): RateLimiter {
  const memoryStore = new InMemoryStore();

  return {
    async check(key: string): Promise<RateLimitResult> {
      const redis = getRedisClient();
      if (!redis) {
        return memoryStore.check(key, maxRequests, windowMs);
      }

      try {
        const fullKey = `${prefix}:${key}`;
        // Atomic INCR + EXPIRE via Lua
        const res = (await redis.eval(
          INCR_EXPIRE_LUA,
          1,
          fullKey,
          windowMs
        )) as [number, number];

        const [current, ttlMs] = res;
        if (current > maxRequests) {
          const retryAfter = Math.max(1, Math.ceil(ttlMs / 1000));
          return { allowed: false, retryAfter, current };
        }
        return { allowed: true, retryAfter: 0, current };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[RateLimit] Redis komutu basarisiz oldu, bellek-ici limitere geciliyor:", msg);
        try {
          return memoryStore.check(key, maxRequests, windowMs);
        } catch {
          // Fail-open
          return { allowed: true, retryAfter: 0 };
        }
      }
    },

    async reset(key: string): Promise<void> {
      memoryStore.reset(key);
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.del(`${prefix}:${key}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[RateLimit] Redis reset basarisiz:", msg);
        }
      }
    },
  };
}

// ─── Factory: createFailureLimiter ───────────────────────────────────────────

export function createFailureLimiter(
  maxFailures: number,
  windowMs: number,
  prefix: string = "rl:fail"
): FailureLimiter {
  const memoryStore = new InMemoryStore();
  const windowSeconds = Math.ceil(windowMs / 1000);

  return {
    windowSeconds,

    async isLimited(key: string): Promise<boolean> {
      const wait = await this.retryAfter(key);
      return wait > 0;
    },

    async retryAfter(key: string): Promise<number> {
      const redis = getRedisClient();
      if (!redis) {
        return memoryStore.retryAfter(key, maxFailures);
      }

      try {
        const fullKey = `${prefix}:${key}`;
        const countStr = await redis.get(fullKey);
        if (!countStr) return 0;

        const count = parseInt(countStr, 10);
        if (count >= maxFailures) {
          const ttlMs = await redis.pttl(fullKey);
          return Math.max(1, Math.ceil(ttlMs / 1000));
        }
        return 0;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[RateLimit] Redis retryAfter basarisiz, bellek-ici limite donuluyor:", msg);
        return memoryStore.retryAfter(key, maxFailures);
      }
    },

    async recordFailure(key: string): Promise<void> {
      memoryStore.recordFailure(key, windowMs);
      const redis = getRedisClient();
      if (!redis) return;

      try {
        const fullKey = `${prefix}:${key}`;
        await redis.eval(INCR_EXPIRE_LUA, 1, fullKey, windowMs);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[RateLimit] Redis recordFailure basarisiz:", msg);
      }
    },

    async reset(key: string): Promise<void> {
      memoryStore.reset(key);
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.del(`${prefix}:${key}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[RateLimit] Redis fail reset basarisiz:", msg);
        }
      }
    },
  };
}

// ─── Helper: IP Tespiti ──────────────────────────────────────────────────────

export function getClientIp(req: Request | Headers): string {
  const headers = req instanceof Headers ? req : req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}
