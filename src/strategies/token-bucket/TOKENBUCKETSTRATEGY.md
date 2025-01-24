# Token Bucket Strategy

`TokenBucketStrategy` is a powerful and efficient implementation of the token bucket algorithm for rate-limiting requests. It integrates seamlessly with many type of storage options for scalable and distributed rate-limiting across multiple services or instances.

## Overview

The `TokenBucketStrategy` allows you to implement rate-limiting by controlling the number of tokens available for a given key. It uses a Redis store to persist token bucket states, making it suitable for distributed systems.

### Features

- Scalable and distributed rate-limiting using many storage options.
- Adjustable bucket capacity and refill rates.
- Built-in methods to check, reset, and retrieve the state of a token bucket.

---

## Usage

### Basic Example

```typescript
import Redis from "ioredis";
import { TokenBucketStrategy, RedisStorage } from "node-rate-limit";

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
    console.log(`Request denied. Retry after ${response.retryAfterInMs}ms. Remaining tokens: ${response.remaining}`);
  }

  // Reset the token bucket for a user
  await tokenBucket.reset(userKey);

  // Retrieve the current state of the token bucket without consuming tokens
  const state = await tokenBucket.get(userKey);
  console.log(`Tokens available: ${state.remaining}`);
})();
```

---

## API Documentation

### `TokenBucketStrategy`

#### Constructor

```typescript
new TokenBucketStrategy(options: TokenBucketStrategyOptions)
```

#### Options

| Option           | Type          | Required | Description                                                                        |
| ---------------- | ------------- | -------- | ---------------------------------------------------------------------------------- |
| `store`          | `BaseStorage` | Yes      | An instance of BaseStorage or any compatible store.                                |
| `bucketCapacity` | `number`      | Yes      | The maximum number of tokens that the bucket can hold. Must be a positive integer. |
| `refillRate`     | `number`      | Yes      | The number of tokens added to the bucket per second. Must be a positive integer.   |

#### Example

```typescript
const options = {
  store: redisStorage,
  bucketCapacity: 10,
  refillRate: 2,
};
const tokenBucket = new TokenBucketStrategy(options);
```

---

### Methods

#### `check(key: string): Promise<TokenBucketStrategyResponse>`

Checks whether a request is allowed under the current token bucket state.

- **Parameters**:
  - `key`: A unique key to identify the rate limit (e.g., user ID, IP address).
- **Returns**:
  - `allowed`: `boolean` - Whether the request is allowed.
  - `remaining`: `number` - The number of tokens remaining in the bucket.
  - `retryAfterInMs`: `number` - The time in milliseconds until a retry is allowed (if `allowed` is `false`).

#### Example

```typescript
const response = await tokenBucket.check("user:123");
if (response.allowed) {
  console.log("Request is allowed");
} else {
  console.log(`Retry after ${response.retryAfterInMs}ms`);
}
```

---

#### `reset(key: string): Promise<void>`

Resets the token bucket state for a specific key.

- **Parameters**:
  - `key`: A unique key to identify the rate limit.

#### Example

```typescript
await tokenBucket.reset("user:123");
```

---

#### `get(key: string): Promise<TokenBucketStrategyResponse>`

Retrieves the current state of the token bucket without consuming any tokens.

- **Parameters**:

  - `key`: A unique key to identify the rate limit.

- **Returns**:
  - `allowed`: `boolean` - Whether requests are currently allowed.
  - `remaining`: `number` - The number of tokens remaining in the bucket.
  - `retryAfterInMs`: `number` - The time in milliseconds until a retry is allowed.

#### Example

```typescript
const state = await tokenBucket.get("user:123");
console.log(`Remaining tokens: ${state.remaining}`);
```

---

## Error Handling

### Validation Errors

The constructor throws errors if invalid options are provided:

- `bucketCapacity` and `refillRate` must be positive integers.
- A valid store implementation is required.

### Example

```typescript
try {
  new TokenBucketStrategy({
    store: redisStorage,
    bucketCapacity: 0,
    refillRate: -1,
  });
} catch (err) {
  console.error(err.message); // "bucketCapacity and refillRate must be greater than 0."
}
```

---
