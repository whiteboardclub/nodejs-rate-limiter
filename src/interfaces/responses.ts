interface BaseResponse {
  allowed: boolean;
}

interface TokenBucketStrategyResponse {
  allowed: boolean;
  remaining: number;
  retryAfterInMs: number; // in milliseconds
}

export { BaseResponse, TokenBucketStrategyResponse };
