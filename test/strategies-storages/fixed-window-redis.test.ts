import Redis from "ioredis";
import { RedisStorage } from "@storages";
import { FixedWindowStrategy } from "@strategies";
import { FixedWindowStrategyOptions } from "@interfaces";

const redis = new Redis();

describe("FixedWindowStrategy with RedisStorage", () => {
  let redisStorage: RedisStorage;
  let fixedWindow: FixedWindowStrategy;
  const userKey = "user:123";

  beforeAll(async () => {
    if (redis.status && redis.status !== "ready" && redis.status !== "connecting") {
      await redis.connect();
    }
    redisStorage = new RedisStorage(redis);
    jest.useFakeTimers();
  });

  afterAll(async () => {
    await redis.quit();
    jest.useRealTimers();
  });

  beforeEach(async () => {
    const now = Date.now();
    const windowStart = Math.floor(now / 10000) * 10000;
    await redisStorage.delete(`fixed_window:${userKey}:${windowStart}`);

    const options: FixedWindowStrategyOptions = { store: redisStorage, windowSize: 10000, maxRequests: 5 };
    fixedWindow = new FixedWindowStrategy(options);
  });

  test("should allow a request if the window is not full", async () => {
    const result = await fixedWindow.check(userKey);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test("should deny a request if the window is full", async () => {
    for (let i = 0; i < 5; i++) {
      await fixedWindow.check(userKey);
    }
    const result = await fixedWindow.check(userKey);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  test("should allow a request in a new window", async () => {
    for (let i = 0; i < 5; i++) {
      await fixedWindow.check(userKey);
    }

    jest.advanceTimersByTime(10000);

    const result = await fixedWindow.check(userKey);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test("should reset the window", async () => {
    for (let i = 0; i < 5; i++) {
      await fixedWindow.check(userKey);
    }

    await fixedWindow.reset(userKey);
    const result = await fixedWindow.check(userKey);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test("should handle invalid options of less than zero", () => {
    expect(() => {
      new FixedWindowStrategy({
        store: redisStorage,
        windowSize: 0,
        maxRequests: 1,
      });
    }).toThrow("FixedWindowStrategy option 'windowSize' must be greater than 0.");
  });

  test("should handle invalid options of not integers", () => {
    expect(() => {
      new FixedWindowStrategy({
        store: redisStorage,
        windowSize: 1.2,
        maxRequests: 1.5,
      });
    }).toThrow("FixedWindowStrategy option 'windowSize' must be an integer.");
  });

  test("should throw an error if no store is provided", () => {
    expect(() => {
      new FixedWindowStrategy({
        store: null as any,
        windowSize: 10000,
        maxRequests: 5,
      });
    }).toThrow("A valid store implementation is required for FixedWindowStrategy.");
  });

  test("should retrieve the current state without consuming a token", async () => {
    for (let i = 0; i < 5; i++) {
      await fixedWindow.check(userKey);
    }
    const result = await fixedWindow.get(userKey);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);

    await fixedWindow.reset(userKey);
    const result2 = await fixedWindow.get(userKey);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(5);
    expect(result2.retryAfterMs).toBe(0);
  });

  test("should isolate rate limits for different keys", async () => {
    const userKey2 = "user:456";
    const result1 = await fixedWindow.check(userKey);
    const result2 = await fixedWindow.check(userKey2);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.remaining).toBe(4);
    expect(result2.remaining).toBe(4);
  });

  test("should correctly report remaining requests at exact boundary", async () => {
    // Fill the window exactly
    for (let i = 0; i < 5; i++) {
      const result = await fixedWindow.check(userKey);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }

    // Next request should be denied
    const result = await fixedWindow.check(userKey);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test("should handle rapid consecutive requests correctly", async () => {
    const results = [];
    for (let i = 0; i < 7; i++) {
      const result = await fixedWindow.check(userKey);
      results.push(result);
    }

    // First 5 should be allowed
    for (let i = 0; i < 5; i++) {
      expect(results[i].allowed).toBe(true);
    }
    // Last 2 should be denied
    for (let i = 5; i < 7; i++) {
      expect(results[i].allowed).toBe(false);
    }
  });

  test("should calculate retryAfterMs correctly when rate limited", async () => {
    for (let i = 0; i < 5; i++) {
      await fixedWindow.check(userKey);
    }

    const result = await fixedWindow.check(userKey);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(10000); // Should be at most the window size
  });

  test("should handle very large window sizes", async () => {
    const largeWindowKey = "large:key";
    // Clean up the key before this test
    const now = Date.now();
    const largeWindowStart = Math.floor(now / 3600000) * 3600000;
    await redisStorage.delete(`fixed_window:${largeWindowKey}:${largeWindowStart}`);

    const largeWindowFixedWindow = new FixedWindowStrategy({
      store: redisStorage,
      windowSize: 3600000, // 1 hour
      maxRequests: 10000,
    });

    const result = await largeWindowFixedWindow.check(largeWindowKey);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9999);
  });

  test("should ensure get() and check() return consistent states for allowed requests", async () => {
    const getResult = await fixedWindow.get(userKey);
    expect(getResult.allowed).toBe(true);
    expect(getResult.remaining).toBe(5);

    const checkResult = await fixedWindow.check(userKey);
    expect(checkResult.allowed).toBe(true);
    expect(checkResult.remaining).toBe(4);

    const getResultAfter = await fixedWindow.get(userKey);
    expect(getResultAfter.remaining).toBe(4);
  });
});
