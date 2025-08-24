# nodejs-rate-limiter

A rate limiting library for Node, using Redis. Implements 5 different rate limiting algorithms.

## Strategies

1. [Token Bucket](./src/strategies/token-bucket/TOKEN-BUCKET-STRATEGY.md)

## Installation

Install the package via npm:

```bash
npm install nodejs-rate-limiter
```

## Usage

```typescript
import Redis from "ioredis";
import { TokenBucketStrategy, RedisStorage } from "nodejs-rate-limiter";

const redis = new Redis();

// Create an instance of RedisStorage
const redisStorage = new RedisStorage(redis);

// Configure the TokenBucketStrategy
const tokenBucket = new TokenBucketStrategy({
  store: redisStorage,
  bucketCapacity: 10, // Maximum number of tokens in the bucket
  refillRate: 2, // Tokens added per second
});

// Define a unique key to track the rate limit (e.g., user ID, IP address)
const userKey = "user:123";

(async () => {
  // Check if a request is allowed
  const response = await tokenBucket.check(userKey);

  if (response.allowed) {
    console.log(`Request allowed. Remaining tokens: ${response.remaining}`);
  } else {
    console.log(`Request denied. Retry after ${response.retryAfterMs}ms. Remaining tokens: ${response.remaining}`);
  }
})();
```

## License

This package is licensed under the [MIT License](LICENSE).

---

### Contributors

Feel free to contribute by submitting issues or pull requests to improve the library.
