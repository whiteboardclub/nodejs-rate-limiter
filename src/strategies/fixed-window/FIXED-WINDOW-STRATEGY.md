# Fixed Window Strategy

The Fixed Window strategy is a rate-limiting algorithm that restricts the number of requests allowed within a fixed time window. For example, it can limit users to 100 requests per hour. A new window starts at the beginning of each hour, and the request count is reset.

## How it works

1.  **Fixed Time Windows**: Time is divided into fixed-size windows (e.g., one hour).
2.  **Request Counter**: Each incoming request increments a counter for the current window.
3.  **Rate Limiting**: If the counter exceeds a specified threshold within a window, further requests are rejected.
4.  **Window Reset**: The counter is reset at the beginning of each new time window.

## Pros

- Simple to implement and understand.
- Ensures that recent bursts of traffic don't affect the rate limit for an extended period.

## Cons

- **Bursts at the edges**: A burst of traffic at the boundary of two windows can exceed the rate limit. For example, if the limit is 100 requests per hour, a user could make 100 requests at the end of an hour and another 100 at the beginning of the next hour, resulting in 200 requests in a short period.
- **Inflexible**: The fixed window can be too rigid for some use cases, as it doesn't account for variations in traffic patterns.
