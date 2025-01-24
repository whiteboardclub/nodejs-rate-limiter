import { StorageType } from "@constants";

abstract class BaseStorage {
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
}

export default BaseStorage;
