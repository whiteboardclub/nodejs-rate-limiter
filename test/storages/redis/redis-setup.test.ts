import Redis from "ioredis";

const redis = new Redis();

beforeAll(async () => {
  if (redis.status && redis.status !== "ready" && redis.status !== "connecting") {
    await redis.connect();
  }
});

afterAll(async () => {
  await redis.quit();
});

test("Redis set and get", async () => {
  await redis.set("key", "value");
  const value = await redis.get("key");
  expect(value).toBe("value");
});
