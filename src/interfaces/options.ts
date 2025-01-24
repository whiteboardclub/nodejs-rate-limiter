import RedisStorage from "@storages/redis/redis-storage";

export interface TokenBucketStrategyOptions {
  store: RedisStorage;
  bucketCapacity: number;
  refillRate: number;
}
