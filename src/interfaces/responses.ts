interface BaseResponse {
  allowed: boolean;
}

interface TokenBucketStrategyResponse {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number; // in milliseconds
}

export { BaseResponse, TokenBucketStrategyResponse };
