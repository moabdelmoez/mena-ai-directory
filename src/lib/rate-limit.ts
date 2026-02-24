type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10000;

function evictExpiredEntries() {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  search: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  registration: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  reviews: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  admin: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  adminLogin: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
} as const;

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetIn: number } {
  const key = identifier;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up old entry if window has passed
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    // Evict expired entries if store is too large (prevent unbounded memory growth)
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      evictExpiredEntries();
    }
    // First request in window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  if (current.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetIn: current.resetTime - now,
    };
  }

  // Increment count
  current.count++;
  return {
    success: true,
    remaining: config.maxRequests - current.count,
    resetIn: current.resetTime - now,
  };
}

export function getRateLimitKey(type: keyof typeof RATE_LIMITS, identifier: string): string {
  return `${type}:${identifier}`;
}

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(evictExpiredEntries, 60 * 1000); // Clean up every minute
}
