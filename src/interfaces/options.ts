import { BaseStorage } from "@storages";

export interface TokenBucketStrategyOptions {
  store: BaseStorage;
  bucketCapacity: number;
  refillRate: number;
}

export interface FixedWindowStrategyOptions {
  store: BaseStorage;
  windowSize: number;
  maxRequests: number;
}
