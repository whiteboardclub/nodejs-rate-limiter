import { Redis } from "ioredis";
import { RedisStorage } from "@storages";

jest.mock("ioredis", () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      flushall: jest.fn(),
    })),
  };
});

describe("RedisStorage", () => {
  let redisClientMock: jest.Mocked<Redis>;
  let redisStorage: RedisStorage;

  beforeEach(() => {
    redisClientMock = new Redis() as jest.Mocked<Redis>;
    redisStorage = new RedisStorage(redisClientMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error if an invalid Redis client is provided", () => {
    expect(() => new RedisStorage(null as any)).toThrow("A valid Redis client instance must be provided.");
  });

  it("should store a value with TTL in Redis", async () => {
    const key = "test-key";
    const value = { name: "John Doe" };
    const ttl = 3600;

    await redisStorage.set(key, value, ttl);

    expect(redisClientMock.set).toHaveBeenCalledWith(key, JSON.stringify(value), "EX", ttl);
  });

  it("should store a value without TTL in Redis", async () => {
    const key = "test-key";
    const value = { name: "John Doe" };

    await redisStorage.set(key, value);

    expect(redisClientMock.set).toHaveBeenCalledWith(key, JSON.stringify(value));
  });

  it("should retrieve a value from Redis", async () => {
    const key = "test-key";
    const value = { name: "John Doe" };
    redisClientMock.get.mockResolvedValueOnce(JSON.stringify(value));

    const result = await redisStorage.get(key);

    expect(redisClientMock.get).toHaveBeenCalledWith(key);
    expect(result).toEqual(value);
  });

  it("should return null if the key does not exist", async () => {
    const key = "test-key";
    redisClientMock.get.mockResolvedValueOnce(null);

    const result = await redisStorage.get(key);

    expect(redisClientMock.get).toHaveBeenCalledWith(key);
    expect(result).toBeNull();
  });

  it("should delete a key from Redis", async () => {
    const key = "test-key";

    await redisStorage.delete(key);

    expect(redisClientMock.del).toHaveBeenCalledWith(key);
  });

  it("should check if a key exists in Redis", async () => {
    const key = "test-key";
    redisClientMock.exists.mockResolvedValueOnce(1);

    const result = await redisStorage.exists(key);

    expect(redisClientMock.exists).toHaveBeenCalledWith(key);
    expect(result).toBe(true);
  });

  it("should return false if a key does not exist", async () => {
    const key = "test-key";
    redisClientMock.exists.mockResolvedValueOnce(0);

    const result = await redisStorage.exists(key);

    expect(redisClientMock.exists).toHaveBeenCalledWith(key);
    expect(result).toBe(false);
  });

  it("should flush all keys in Redis", async () => {
    await redisStorage.flushAll();

    expect(redisClientMock.flushall).toHaveBeenCalled();
  });

  it("should handle errors while setting a value", async () => {
    const key = "test-key";
    const value = { name: "John Doe" };
    redisClientMock.set.mockRejectedValueOnce(new Error("Redis error"));

    await expect(redisStorage.set(key, value)).rejects.toThrow("Failed to set value in Redis.");
  });

  it("should handle errors while retrieving a value", async () => {
    const key = "test-key";
    const redisError = new Error("Redis error");
    redisClientMock.get.mockRejectedValueOnce(redisError);

    const result = await redisStorage.get(key);
    expect(result).toBeNull();
  });

  it("should handle errors while deleting a key", async () => {
    const key = "test-key";
    redisClientMock.del.mockRejectedValueOnce(new Error("Redis error"));

    await expect(redisStorage.delete(key)).rejects.toThrow('Error deleting key "test-key"');
  });

  it("should handle errors while checking existence of a key", async () => {
    const key = "test-key";
    redisClientMock.exists.mockRejectedValueOnce(new Error("Redis error"));

    await expect(redisStorage.exists(key)).rejects.toThrow('Error checking existence of key "test-key"');
  });

  it("should handle errors while flushing all keys", async () => {
    redisClientMock.flushall.mockRejectedValueOnce(new Error("Redis error"));

    await expect(redisStorage.flushAll()).rejects.toThrow("Failed to flush all keys in Redis.");
  });
});
