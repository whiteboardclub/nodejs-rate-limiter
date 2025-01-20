import Redis from "ioredis";
import { RedisStorage } from "../src/storages/";
import { TokenBucketStrategy } from "../src/strategies";
import { TokenBucketStrategyOptions } from "../src/interfaces";

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
    expect(result.retryAfterInMs).toBeGreaterThan(0);
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
    }).toThrow("bucketCapacity and refillRate must be greater than 0.");
  });

  test("should handle invalid options of not integers", () => {
    expect(() => {
      new TokenBucketStrategy({
        store: redisStorage,
        bucketCapacity: 1.2,
        refillRate: 1.5,
      });
    }).toThrow("bucketCapacity and refillRate must be integers.");
  });

  test("should handle fractional tokens correctly", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    jest.advanceTimersByTime(500);
    const result = await tokenBucket.check(userKey);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterInMs).toBeGreaterThan(0);
  });

  test("should calculate retryAfterInMs correctly when no tokens are available", async () => {
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(userKey);
    }

    const result = await tokenBucket.check(userKey);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterInMs).toBeGreaterThan(0);
  });
});
