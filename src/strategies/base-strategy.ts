import { BaseStorage } from "../storages";
import { BaseResponse } from "../interfaces";

abstract class BaseStrategy {
  protected store: BaseStorage;
  constructor(store: BaseStorage) {
    this.store = store;
  }
  /**
   * Check whether a request is allowed under the rate limiting strategy.
   * @param _key The unique identifier for the resource being rate limited.
   */
  abstract check(_key: string): Promise<BaseResponse>;

  /**
   * Optionally reset any stored state for a given key.
   * @param key The unique identifier for the resource.
   */
  abstract reset(_key: string): Promise<void>;
}
export default BaseStrategy;
