import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  createRateLimiter,
  createFailureLimiter,
  getClientIp,
  closeRedisConnection,
} from "./rate-limit";

describe("Rate Limiter (In-Memory & Redis Fallback)", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(async () => {
    delete process.env.REDIS_URL;
    await closeRedisConnection();
  });

  afterEach(async () => {
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
    await closeRedisConnection();
  });

  it("izin verilen istek sınırını aşmayan isteklere izin vermeli", async () => {
    const limiter = createRateLimiter(3, 5000, "test:rate:basic");

    const res1 = await limiter.check("ip-1");
    assert.equal(res1.allowed, true);
    assert.equal(res1.retryAfter, 0);

    const res2 = await limiter.check("ip-1");
    assert.equal(res2.allowed, true);

    const res3 = await limiter.check("ip-1");
    assert.equal(res3.allowed, true);

    const res4 = await limiter.check("ip-1");
    assert.equal(res4.allowed, false);
    assert.ok(res4.retryAfter > 0);
  });

  it("farklı anahtarları bağımsız sınırlandırmalı", async () => {
    const limiter = createRateLimiter(1, 5000, "test:rate:multi");

    const r1 = await limiter.check("user-A");
    assert.equal(r1.allowed, true);

    const r2 = await limiter.check("user-A");
    assert.equal(r2.allowed, false);

    const r3 = await limiter.check("user-B");
    assert.equal(r3.allowed, true);
  });

  it("reset() çağrıldığında sayacı sıfırlamalı", async () => {
    const limiter = createRateLimiter(1, 5000, "test:rate:reset");

    await limiter.check("client-1");
    const blocked = await limiter.check("client-1");
    assert.equal(blocked.allowed, false);

    await limiter.reset("client-1");

    const allowedAgain = await limiter.check("client-1");
    assert.equal(allowedAgain.allowed, true);
  });

  it("FailureLimiter: başarısız denemeleri sayıp sınırı aşınca engellemeli", async () => {
    const limiter = createFailureLimiter(2, 5000, "test:fail:limit");

    assert.equal(await limiter.isLimited("test-user"), false);

    await limiter.recordFailure("test-user");
    assert.equal(await limiter.isLimited("test-user"), false);

    await limiter.recordFailure("test-user");
    assert.equal(await limiter.isLimited("test-user"), true);
    assert.ok((await limiter.retryAfter("test-user")) > 0);

    await limiter.reset("test-user");
    assert.equal(await limiter.isLimited("test-user"), false);
  });

  it("Redis bağlantısı kapalı/hatalı olduğunda bellek-içi limitere düşmeli (fail-open/fallback)", async () => {
    // Geçersiz ve kapalı bir Redis portu veriyoruz
    process.env.REDIS_URL = "redis://127.0.0.1:54321";

    const limiter = createRateLimiter(2, 5000, "test:redis:fallback");

    // İlk istekte Redis hatası loglanmalı ve bellek-içi çalışmalı
    const res1 = await limiter.check("fallback-client");
    assert.equal(res1.allowed, true);

    const res2 = await limiter.check("fallback-client");
    assert.equal(res2.allowed, true);

    const res3 = await limiter.check("fallback-client");
    assert.equal(res3.allowed, false);
    assert.ok(res3.retryAfter > 0);
  });

  it("getClientIp: başlıklardan doğru IP adresini çözümlemeli", () => {
    const headers1 = new Headers({
      "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
    });
    assert.equal(getClientIp(headers1), "203.0.113.195");

    const headers2 = new Headers({
      "x-real-ip": "198.51.100.42",
    });
    assert.equal(getClientIp(headers2), "198.51.100.42");

    const headers3 = new Headers();
    assert.equal(getClientIp(headers3), "127.0.0.1");
  });
});
