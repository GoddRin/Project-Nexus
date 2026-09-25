/**
 * Shared AI Core In-Memory Rate Limiter
 * Provides sliding-window rate limiting per user or client identifier to prevent provider quota exhaustion.
 */

export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed within window
  windowMs: number;    // Window size in milliseconds
  maxPromptLength?: number; // Maximum query length allowed
}

interface ClientBucket {
  timestamps: number[];
}

export class AIRateLimiter {
  private buckets = new Map<string, ClientBucket>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 20, windowMs: 60 * 1000, maxPromptLength: 4000 }) {
    this.config = config;

    // Periodic garbage collection every 5 minutes
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 5 * 60 * 1000).unref?.();
    }
  }

  public check(clientId: string, promptText?: string): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    // 1. Check prompt length
    if (this.config.maxPromptLength && promptText && promptText.length > this.config.maxPromptLength) {
      return {
        allowed: false,
        reason: `Prompt exceeds maximum allowed length of ${this.config.maxPromptLength} characters.`,
      };
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let bucket = this.buckets.get(clientId);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(clientId, bucket);
    }

    // Filter out timestamps older than the sliding window
    bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

    if (bucket.timestamps.length >= this.config.maxRequests) {
      const oldest = bucket.timestamps[0];
      const retryAfterMs = Math.max(0, oldest + this.config.windowMs - now);
      return {
        allowed: false,
        retryAfterMs,
        reason: `Rate limit exceeded. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before sending another message.`,
      };
    }

    // Record this request
    bucket.timestamps.push(now);
    return { allowed: true };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    for (const [key, bucket] of this.buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
      if (bucket.timestamps.length === 0) {
        this.buckets.delete(key);
      }
    }
  }
}

// Global default rate limiter: 25 requests per minute per user
export const globalAIRateLimiter = new AIRateLimiter({
  maxRequests: 25,
  windowMs: 60 * 1000,
  maxPromptLength: 4000,
});
