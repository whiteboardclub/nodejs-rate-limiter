export interface BaseResponse {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface TokenBucketStrategyResponse extends BaseResponse {}
export interface FixedWindowStrategyResponse extends BaseResponse {}
