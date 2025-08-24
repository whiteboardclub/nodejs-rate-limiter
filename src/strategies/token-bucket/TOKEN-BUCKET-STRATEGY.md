# Token Bucket Strategy

`TokenBucketStrategy` is a powerful and efficient implementation of the token bucket algorithm for rate-limiting requests. It integrates seamlessly with many type of storage options for scalable and distributed rate-limiting across multiple services or instances.

## Overview

The `TokenBucketStrategy` allows you to implement rate-limiting by controlling the number of tokens available for a given key. It uses a compatible storage provider to persist token bucket states, making it suitable for distributed systems.

### Features

- Scalable and distributed rate-limiting using many storage options.
- Adjustable bucket capacity and refill rates.
- Built-in methods to check, reset, and retrieve the state of a token bucket.

---

## Usage

### Basic Example

```typescript
import { TokenBucketStrategy, MemoryStorage } from "nodejs-rate-limiter";

// Create an instance of a storage
const memoryStorage = new MemoryStorage();

// Configure the TokenBucketStrategy
const tokenBucket = new TokenBucketStrategy({
  store: memoryStorage,
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
  store: memoryStorage,
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
  - `retryAfterMs`: `number` - The time in milliseconds until a retry is allowed (if `allowed` is `false`).

#### Example

```typescript
const response = await tokenBucket.check("user:123");
if (response.allowed) {
  console.log("Request is allowed");
} else {
  console.log(`Retry after ${response.retryAfterMs}ms`);
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
  - `retryAfterMs`: `number` - The time in milliseconds until a retry is allowed.

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
    store: memoryStorage,
    bucketCapacity: 0,
    refillRate: -1,
  });
} catch (err) {
  console.error(err.message); // "bucketCapacity and refillRate must be greater than 0."
}
```

---

### Storage Errors

If the underlying storage fails (e.g., Redis connection error), the methods will throw an error. It is recommended to wrap calls in a `try...catch` block.

#### Example

```typescript
try {
  await tokenBucket.check("user:123");
} catch (err) {
  console.error("Storage error:", err);
}
```

---

## How It Works

The `TokenBucketStrategy` works as follows:

1. **Initialization**: When a request is made for a new key, a token bucket is created with the maximum capacity.
2. **Token Refill**: Tokens are refilled based on the time elapsed since the last request. The refill logic is lazy, meaning tokens are only added when a request is made.
3. **Token Consumption**: If enough tokens are available, one token is consumed, and the request is allowed. Otherwise, the request is denied.
4. **State Persistence**: The bucket's state (remaining tokens and last update timestamp) is stored in the provided storage to ensure it persists across requests and instances.

**Note on Atomicity**: This implementation does not guarantee atomic operations, as it makes separate calls to the storage for getting and setting the token count. This could lead to race conditions in a highly concurrent, distributed environment. For guaranteed atomicity, use a storage adapter that implements atomic operations (e.g., using Lua scripts for Redis).

---

## Use Cases

- **API Rate Limiting**: Protect your APIs from abuse by limiting the number of requests per user or IP address.
- **Throttling**: Control the rate of outbound requests to other services to avoid overwhelming them.
- **Fair Usage**: Ensure fair resource allocation among users by preventing any single user from consuming excessive resources.

---

## Contributing

Contributions are welcome! Please submit a pull request or create an issue to get started.

---

## License

This project is licensed under the MIT License. See the [LICENSE](../../../LICENSE) file for details.
