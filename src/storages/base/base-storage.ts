import { StorageType } from "@constants";

export abstract class BaseStorage {
  protected name: StorageType;
  constructor(name: StorageType) {
    this.name = name;
  }
  /**
   * Store a key-value pair with an optional TTL (time-to-live).
   * @param _key The key to store the data.
   * @param _value The data to store.
   * @param _ttl Optional TTL in milliseconds.
   */
  abstract set(_key: string, _value: any, _ttl?: number): Promise<void>;

  /**
   * Retrieve the value for a given key.
   * @param _key The key to retrieve.
   */
  abstract get(_key: string): Promise<any>;

  /**
   * Delete a key from the storage.
   * @param _key The key to delete.
   */
  abstract delete(_key: string): Promise<void>;

  /**
   * Increment a key's value and set a TTL.
   * @param _key The key to increment.
   * @param _ttl The TTL in milliseconds.
   */
  abstract increment(_key: string, _ttl: number): Promise<number>;

  /**
   * Atomically update token bucket state (optional, storage-specific implementation).
   * @param _bucketKey The key for bucket tokens
   * @param _lastRefillKey The key for last refill timestamp
   * @param _tokens The token count to set
   * @param _lastRefill The last refill timestamp to set
   */
  async updateTokenBucketState?(
    _bucketKey: string,
    _lastRefillKey: string,
    _tokens: number,
    _lastRefill: number
  ): Promise<void>;
}
