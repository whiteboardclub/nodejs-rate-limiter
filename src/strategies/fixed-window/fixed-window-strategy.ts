import { BaseStrategy } from "@strategies/base/base-strategy";
import { FixedWindowStrategyOptions, FixedWindowStrategyResponse } from "@interfaces";

export class FixedWindowStrategy extends BaseStrategy {
  private windowSize: number; // in milliseconds
  private maxRequests: number;

  /**
   * Constructor for FixedWindowStrategy
   * @param options An instance of FixedWindowStrategyOptions
   */
  constructor(options: FixedWindowStrategyOptions) {
    if (!options.store) {
      throw new Error("A valid store implementation is required for FixedWindowStrategy.");
    }
    super(options.store);
    this.validateOptions(options);
    this.windowSize = options.windowSize;
    this.maxRequests = options.maxRequests;
  }

  /**
   * Validates the options provided to the constructor.
   * @param options The FixedWindowStrategyOptions to validate
   */
  private validateOptions(options: FixedWindowStrategyOptions): void {
    if (options.windowSize <= 0) {
      throw new Error("FixedWindowStrategy option 'windowSize' must be greater than 0.");
    }
    if (options.maxRequests <= 0) {
      throw new Error("FixedWindowStrategy option 'maxRequests' must be greater than 0.");
    }
    if (!Number.isInteger(options.windowSize)) {
      throw new Error("FixedWindowStrategy option 'windowSize' must be an integer.");
    }
    if (!Number.isInteger(options.maxRequests)) {
      throw new Error("FixedWindowStrategy option 'maxRequests' must be an integer.");
    }
  }

  /**
   * Generates keys for the fixed window and calculates its start time.
   * @param key A unique key to identify the rate limit
   */
  private getWindowKey(key: string): { windowKey: string; windowStart: number } {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowSize) * this.windowSize;
    return {
      windowKey: `fixed_window:${key}:${windowStart}`,
      windowStart,
    };
  }

  /**
   * Calculates the retry after time in milliseconds based on the window start.
   * @param windowStart The start time of the current window
   */
  private calculateRetryAfter(windowStart: number): number {
    const now = Date.now();
    return Math.max(0, windowStart + this.windowSize - now);
  }

  /**
   * Checks if a request is allowed under the fixed window strategy.
   * @param key A unique key to identify the rate limit
   */
  async check(key: string): Promise<FixedWindowStrategyResponse> {
    const { windowKey, windowStart } = this.getWindowKey(key);
    const currentRequests = await this.store.increment(windowKey, this.windowSize);

    const allowed = currentRequests <= this.maxRequests;
    const remaining = allowed ? this.maxRequests - currentRequests : 0;

    return {
      allowed,
      remaining,
      retryAfterMs: allowed ? 0 : this.calculateRetryAfter(windowStart),
    };
  }

  /**
   * Retrieves the current fixed window state without consuming a request.
   * @param key A unique key to identify the rate limit
   */
  async get(key: string): Promise<FixedWindowStrategyResponse> {
    const { windowKey, windowStart } = this.getWindowKey(key);
    const currentRequests = parseInt((await this.store.get(windowKey)) ?? "0");

    const allowed = currentRequests < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - currentRequests);

    return {
      allowed,
      remaining,
      retryAfterMs: allowed ? 0 : this.calculateRetryAfter(windowStart),
    };
  }

  /**
   * Resets the fixed window state for a given key.
   * @param key A unique key to identify the rate limit
   */
  async reset(key: string): Promise<void> {
    const { windowKey } = this.getWindowKey(key);
    await this.store.delete(windowKey);
  }
}
