# nodejs-rate-limiter

A high-performance rate limiting library for Node.js using Redis. Implements multiple rate limiting algorithms with support for atomic Lua script operations.

## Features

- **Multiple Strategies**: Token Bucket and Fixed Window algorithms
- **Atomic Operations**: Uses Lua scripts for thread-safe Redis operations
- **High Performance**: Optimized for production environments
- **TypeScript**: Full TypeScript support with type safety
- **Flexible Storage**: Extensible storage layer for different backends

## Requirements

- Node.js >= 22
- Redis >= 5.0

## Installation

Install the package via npm:

```bash
npm install nodejs-rate-limiter
```

## Quick Start

### Token Bucket Strategy

The Token Bucket algorithm allows for burst traffic while maintaining an average rate limit.

```typescript
import Redis from "ioredis";
import { TokenBucketStrategy, RedisStorage } from "nodejs-rate-limiter";

const redis = new Redis();
const redisStorage = new RedisStorage(redis);

const tokenBucket = new TokenBucketStrategy({
  store: redisStorage,
  bucketCapacity: 10, // Maximum tokens in the bucket
  refillRate: 2, // Tokens added per second
});

const userKey = "user:123";

(async () => {
  const response = await tokenBucket.check(userKey);

  if (response.allowed) {
    console.log(`Request allowed. Remaining tokens: ${response.remaining}`);
  } else {
    console.log(`Rate limited. Retry after ${response.retryAfterMs}ms`);
  }
})();
```

### Fixed Window Strategy

The Fixed Window algorithm divides time into fixed intervals and limits requests per interval.

```typescript
import Redis from "ioredis";
import { FixedWindowStrategy, RedisStorage } from "nodejs-rate-limiter";

const redis = new Redis();
const redisStorage = new RedisStorage(redis);

const fixedWindow = new FixedWindowStrategy({
  store: redisStorage,
  windowSize: 60000, // 1 minute window in milliseconds
  maxRequests: 100, // Max requests per window
});

const userKey = "user:123";

(async () => {
  const response = await fixedWindow.check(userKey);

  if (response.allowed) {
    console.log(`Request allowed. Remaining: ${response.remaining}`);
  } else {
    console.log(`Window exceeded. Retry after ${response.retryAfterMs}ms`);
  }
})();
```

## Strategies

### Token Bucket

- **Use Case**: APIs that need to allow bursts while maintaining average rate
- **Pros**: Smooth traffic handling, allows controlled bursts
- **Cons**: More complex, requires state management
- **Details**: [Full Documentation](./src/strategies/token-bucket/TOKEN-BUCKET-STRATEGY.md)

### Fixed Window

- **Use Case**: Simple rate limiting with predictable windows
- **Pros**: Simple to understand and implement
- **Cons**: Burst at window boundaries
- **Details**: [Full Documentation](./src/strategies/fixed-window/FIXED-WINDOW-STRATEGY.md)

## API Reference

### check(key: string): Promise<BaseResponse>

Checks if a request is allowed and consumes a token/request slot if allowed.

```typescript
const response = await strategy.check("user:123");
// {
//   allowed: boolean,
//   remaining: number,
//   retryAfterMs: number
// }
```

### get(key: string): Promise<BaseResponse>

Retrieves the current rate limit state without consuming a token/request slot.

```typescript
const state = await strategy.get("user:123");
// Returns current state without side effects
```

### reset(key: string): Promise<void>

Resets the rate limit state for a specific key.

```typescript
await strategy.reset("user:123");
```

## Advanced Configuration

### Lua Script Support

By default, Redis operations use Lua scripts for atomicity. This ensures that rate limit updates are thread-safe and atomic.

```typescript
// Enable Lua scripts (default)
const storage = new RedisStorage(redis, true);

// Disable Lua scripts (not recommended for production)
const storage = new RedisStorage(redis, false);
```

### Custom Storage

Extend the `BaseStorage` class to implement custom storage backends:

```typescript
import { BaseStorage, BaseResponse } from "nodejs-rate-limiter";

export class CustomStorage extends BaseStorage {
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Your implementation
  }

  async get(key: string): Promise<any> {
    // Your implementation
  }

  async delete(key: string): Promise<void> {
    // Your implementation
  }

  async increment(key: string, ttl: number): Promise<number> {
    // Your implementation
  }
}
```

## Error Handling

The library provides specific error types for different scenarios:

```typescript
import { ValidationError, StorageError, RateLimitExceededError } from "nodejs-rate-limiter";

try {
  const strategy = new TokenBucketStrategy(invalidOptions);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Invalid configuration:", error.message);
  }
}

try {
  const response = await strategy.check(userKey);
} catch (error) {
  if (error instanceof StorageError) {
    console.error("Redis operation failed:", error.message);
  }
}
```

## Performance Considerations

1. **Connection Pooling**: Use Redis connection pooling for better performance
2. **Key Naming**: Use meaningful key prefixes to organize rate limit data
3. **TTL Management**: Keys automatically expire to prevent memory leaks
4. **Lua Scripts**: Atomic operations reduce race conditions in distributed systems

## Examples

### Express Middleware

```typescript
import express from "express";
import { TokenBucketStrategy, RedisStorage } from "nodejs-rate-limiter";
import Redis from "ioredis";

const redis = new Redis();
const storage = new RedisStorage(redis);
const rateLimiter = new TokenBucketStrategy({
  store: storage,
  bucketCapacity: 100,
  refillRate: 10,
});

const rateLimitMiddleware = async (req, res, next) => {
  const userKey = req.ip || "unknown";
  const response = await rateLimiter.check(userKey);

  res.set("X-RateLimit-Remaining", response.remaining.toString());
  res.set("X-RateLimit-RetryAfter", response.retryAfterMs.toString());

  if (!response.allowed) {
    return res.status(429).json({
      error: "Too many requests",
      retryAfter: response.retryAfterMs,
    });
  }

  next();
};

const app = express();
app.use(rateLimitMiddleware);
```

### Multiple Rate Limits

```typescript
const tokenBucket = new TokenBucketStrategy({
  store: storage,
  bucketCapacity: 100,
  refillRate: 10,
});

const fixedWindow = new FixedWindowStrategy({
  store: storage,
  windowSize: 3600000, // 1 hour
  maxRequests: 1000,
});

const checkRateLimit = async (userId) => {
  const burst = await tokenBucket.check(`burst:${userId}`);
  const hourly = await fixedWindow.check(`hourly:${userId}`);

  return burst.allowed && hourly.allowed;
};
```

## License

This package is licensed under the ISC License.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests to improve the library.
