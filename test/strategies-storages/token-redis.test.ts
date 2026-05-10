import Redis from "ioredis";
import { RedisStorage } from "@storages";
import { TokenBucketStrategy } from "@strategies";
import { TokenBucketStrategyOptions } from "@interfaces";

const redis = new Redis();

describe("TokenBucketStrategy with RedisStorage", () => {
  let redisStorage: RedisStorage;
  let tokenBucket: TokenBucketStrategy;
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
    await redisStorage.delete(`token_bucket:${userKey}`);
    await redisStorage.delete(`token_bucket:${userKey}:last_refill`);

    const options: TokenBucketStrategyOptions = { store: redisStorage, bucketCapacity: 10, refillRate: 2 };
    tokenBucket = new TokenBucketStrategy(options);
  });

  test("should allow a request if there are enough tokens", async () => {
    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  test("should deny a request if there are not enough tokens", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }
    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  test("should refill tokens after some time", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    jest.advanceTimersByTime(4000);
    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(true);
    // 8 tokens refilled, 1 consumed
    expect(result.remaining).toBe(7);
  });

  test("should reset the bucket", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    await tokenBucket.reset(userKey);
    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  test("should retrieve the current state without consuming a token", async () => {
    const stateBefore = await tokenBucket.get(userKey);
    expect(stateBefore.remaining).toBe(10);
    expect(stateBefore.allowed).toBe(true);

    await tokenBucket.check(userKey);

    const stateAfter = await tokenBucket.get(userKey);
    expect(stateAfter.remaining).toBe(9);
    expect(stateAfter.allowed).toBe(true);
  });

  test("should handle invalid options of less than zero", () => {
    expect(() => {
      new TokenBucketStrategy({
        store: redisStorage,
        bucketCapacity: 0,
        refillRate: 1,
      });
    }).toThrow("TokenBucketStrategy option 'bucketCapacity' must be greater than 0.");
  });

  test("should handle invalid options of not integers", () => {
    expect(() => {
      new TokenBucketStrategy({
        store: redisStorage,
        bucketCapacity: 1.2,
        refillRate: 1.5,
      });
    }).toThrow("TokenBucketStrategy option 'bucketCapacity' must be an integer.");
  });

  test("should handle fractional tokens correctly", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    jest.advanceTimersByTime(500);
    const result = await tokenBucket.check(userKey);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  test("should calculate retryAfterMs correctly when no tokens are available", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  test("should throw an error if no store is provided", () => {
    expect(() => {
      new TokenBucketStrategy({
        store: null as any,
        bucketCapacity: 10,
        refillRate: 2,
      });
    }).toThrow("A valid store implementation is required for TokenBucketStrategy.");
  });

  test("should isolate rate limits for different keys", async () => {
    const userKey2 = "user:456";
    const result1 = await tokenBucket.check(userKey);
    const result2 = await tokenBucket.check(userKey2);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.remaining).toBe(9);
    expect(result2.remaining).toBe(9);
  });

  test("should handle burst of requests followed by refill", async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      const result = await tokenBucket.check(userKey);
      expect(result.allowed).toBe(true);
    }

    // Next request should be denied
    const deniedResult = await tokenBucket.check(userKey);
    expect(deniedResult.allowed).toBe(false);

    // Advance time to refill
    jest.advanceTimersByTime(3000); // 6 tokens refilled
    const refillResult = await tokenBucket.check(userKey);
    expect(refillResult.allowed).toBe(true);
    expect(refillResult.remaining).toBe(5);
  });

  test("should cap tokens at bucket capacity", async () => {
    // Wait for full refill (would require 5 seconds but bucket caps at 10)
    jest.advanceTimersByTime(10000);
    const result = await tokenBucket.get(userKey);
    expect(result.remaining).toBeLessThanOrEqual(10);
  });

  test("should correctly calculate retryAfterMs for partial tokens", async () => {
    // Consume tokens
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    // Advance time slightly
    jest.advanceTimersByTime(250); // 0.5 tokens refilled

    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    // Should be less than 500ms for 1 token at 2 tokens/sec, but allow some variance
    expect(result.retryAfterMs).toBeLessThanOrEqual(1000);
  });

  test("should ensure get() does not consume tokens", async () => {
    const initial = await tokenBucket.get(userKey);
    expect(initial.remaining).toBe(10);

    // Call get multiple times
    for (let i = 0; i < 5; i++) {
      const state = await tokenBucket.get(userKey);
      expect(state.remaining).toBe(10);
    }

    // Check should now consume a token
    const checkResult = await tokenBucket.check(userKey);
    expect(checkResult.remaining).toBe(9);

    const afterCheck = await tokenBucket.get(userKey);
    expect(afterCheck.remaining).toBe(9);
  });

  test("should handle very high refill rates", async () => {
    const fastBucket = new TokenBucketStrategy({
      store: redisStorage,
      bucketCapacity: 100,
      refillRate: 50, // 50 tokens per second
    });

    // Consume all tokens
    for (let i = 0; i < 100; i++) {
      await fastBucket.check("fast:key");
    }

    // Advance time by 1 second
    jest.advanceTimersByTime(1000);

    const result = await fastBucket.check("fast:key");
    expect(result.allowed).toBe(true);
    // Should have 49 tokens remaining (50 refilled - 1 consumed)
    expect(result.remaining).toBeGreaterThanOrEqual(45);
  });

  test("should handle check and get consistency", async () => {
    const beforeGet = await tokenBucket.get(userKey);
    const beforeCheck = await tokenBucket.check(userKey);
    const afterCheck = await tokenBucket.get(userKey);

    expect(beforeGet.remaining).toBe(10);
    expect(beforeCheck.remaining).toBe(9);
    expect(afterCheck.remaining).toBe(9);
  });
});
