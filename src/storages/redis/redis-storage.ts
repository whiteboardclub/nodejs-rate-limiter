import { StorageType } from "@constants";
import { BaseStorage } from "@storages/base/base-storage";
import { Redis } from "ioredis";
import { ValidationError, StorageError } from "@errors"; // Import new error types

// Extend Redis type to include custom commands
interface CustomRedis extends Redis {
  atomicIncrement?(key: string, ttl: number): Promise<number>;
  updateTokenBucket?(bucketKey: string, lastRefillKey: string, tokens: number, lastRefill: number): Promise<number>;
}

export class RedisStorage extends BaseStorage {
  private redisClient: CustomRedis;
  private useLuaScripts: boolean;

  /**
   * Constructor for RedisStorage
   * @param redisClient A Redis client instance provided by the user
   * @param useLuaScripts Optional. Whether to use Lua scripts for atomic operations. Defaults to true.
   */
  constructor(redisClient: Redis, useLuaScripts: boolean = true) {
    super(StorageType.redis);

    if (!redisClient || typeof redisClient.set !== "function") {
      throw new ValidationError("A valid Redis client instance must be provided.");
    }

    this.redisClient = redisClient as CustomRedis;
    this.useLuaScripts = useLuaScripts;

    // Define custom commands on this specific redisClient instance if not already defined
    if (this.useLuaScripts) {
      if (!(this.redisClient as any).atomicIncrement) {
        this.redisClient.defineCommand("atomicIncrement", {
          numberOfKeys: 1,
          lua: `
            local current = redis.call('INCR', KEYS[1])
            if tonumber(current) == 1 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return current
          `,
        });
      }

      if (!(this.redisClient as any).updateTokenBucket) {
        this.redisClient.defineCommand("updateTokenBucket", {
          numberOfKeys: 2,
          lua: `
            redis.call('SET', KEYS[1], ARGV[1])
            redis.call('SET', KEYS[2], ARGV[2])
            return 1
          `,
        });
      }
    }
  }

  /**
   * Stores a value in Redis with an optional TTL (time-to-live).
   * @param key The key under which the value is stored
   * @param value The data to store
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Failed to set value in Redis: ${error.message}`);
      }
      throw new StorageError(`Failed to set value in Redis: ${String(error)}`);
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Failed to get value from Redis: ${error.message}`);
      }
      throw new StorageError(`Failed to get value from Redis: ${String(error)}`);
    }
  }

  /**
   * Deletes a key from Redis.
   * @param key The key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Error deleting key "${key}" from Redis: ${error.message}`);
      }
      throw new StorageError(`Error deleting key "${key}" from Redis: ${String(error)}`);
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Error checking existence of key "${key}" in Redis: ${error.message}`);
      }
      throw new StorageError(`Error checking existence of key "${key}" in Redis: ${String(error)}`);
    }
  }

  /**
   * Flushes all keys in Redis (use with caution).
   */
  async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushall();
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Failed to flush all keys in Redis: ${error.message}`);
      }
      throw new StorageError(`Failed to flush all keys in Redis: ${String(error)}`);
    }
  }

  /**
   * Atomically increments a key's value and sets a TTL on the first increment.
   * @param key The key to increment.
   * @param ttl The TTL in milliseconds.
   * @returns The new value of the key.
   * @throws {StorageError} If Lua scripts are disabled or Redis operation fails.
   */
  async increment(key: string, ttl: number): Promise<number> {
    if (!this.useLuaScripts) {
      throw new StorageError("Atomic increment requires Lua scripts, which are currently disabled.");
    }
    try {
      return (await (this.redisClient.atomicIncrement?.(key, ttl) as Promise<number>)) || 0;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Failed to increment key "${key}" in Redis: ${error.message}`);
      }
      throw new StorageError(`Failed to increment key "${key}" in Redis: ${String(error)}`);
    }
  }

  /**
   * Atomically updates token bucket state (tokens and last refill timestamp).
   * @param bucketKey The key for storing current tokens
   * @param lastRefillKey The key for storing last refill timestamp
   * @param tokens The updated token count
   * @param lastRefill The updated last refill timestamp
   * @throws {StorageError} If Lua scripts are disabled or Redis operation fails.
   */
  async updateTokenBucketState(
    bucketKey: string,
    lastRefillKey: string,
    tokens: number,
    lastRefill: number
  ): Promise<void> {
    if (!this.useLuaScripts) {
      throw new StorageError("Atomic token bucket update requires Lua scripts, which are currently disabled.");
    }
    try {
      await (this.redisClient.updateTokenBucket?.(bucketKey, lastRefillKey, tokens, lastRefill) as Promise<number>);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new StorageError(`Failed to update token bucket state in Redis: ${error.message}`);
      }
      throw new StorageError(`Failed to update token bucket state in Redis: ${String(error)}`);
    }
  }
}

export default RedisStorage;
