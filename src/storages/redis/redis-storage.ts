import { StorageType } from "@constants";
import { BaseStorage } from "@storages/base/base-storage";
import { Redis } from "ioredis";

export class RedisStorage extends BaseStorage {
  private redisClient: Redis;

  /**
   * Constructor for RedisStorage
   * @param redisClient A Redis client instance provided by the user
   */
  constructor(redisClient: Redis) {
    super(StorageType.redis);

    if (!redisClient || typeof redisClient.set !== "function") {
      console.error("A valid Redis client instance must be provided.");
      throw new Error("A valid Redis client instance must be provided.");
    }

    this.redisClient = redisClient;
  }

  /**
   * Stores a value in Redis with an optional TTL (time-to-live).
   * @param key The key under which the value is stored
   * @param value The value to store
   * @param ttl Optional TTL in seconds
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.set(key, serializedValue, "EX", ttl);
      } else {
        await this.redisClient.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`RedisStorage: Error setting key "${key}":`, error);
      throw new Error("Failed to set value in Redis.");
    }
  }

  /**
   * Retrieves a value from Redis.
   * @param key The key to retrieve the value for
   * @returns The parsed value or `null` if the key does not exist
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      console.error(`RedisStorage: Error retrieving key "${key}":`, error);
      return null;
    }
  }

  /**
   * Deletes a key from Redis.
   * @param key The key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error(`RedisStorage: Error deleting key "${key}":`, error);
      throw new Error(`Error deleting key "${key}"`);
    }
  }

  /**
   * Checks if a key exists in Redis.
   * @param key The key to check
   * @returns A boolean indicating whether the key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`RedisStorage: Error checking existence of key "${key}":`, error);
      throw new Error(`Error checking existence of key "${key}"`);
    }
  }

  /**
   * Flushes all keys in Redis (use with caution).
   */
  async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushall();
    } catch (error) {
      console.error("RedisStorage: Error flushing all keys:", error);
      throw new Error("Failed to flush all keys in Redis.");
    }
  }
}

export default RedisStorage;
