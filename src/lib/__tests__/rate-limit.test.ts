import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Reset the rate limit store between tests by advancing time past any windows
    vi.useFakeTimers();
  });

  it('allows first request', () => {
    const key = `test-allow-${Date.now()}`;
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 60000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    vi.useRealTimers();
  });

  it('decrements remaining count', () => {
    const key = `test-decrement-${Date.now()}`;
    const config = { maxRequests: 3, windowMs: 60000 };

    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
    vi.useRealTimers();
  });

  it('rejects when limit exceeded', () => {
    const key = `test-reject-${Date.now()}`;
    const config = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    vi.useRealTimers();
  });

  it('resets after window expires', () => {
    const key = `test-reset-${Date.now()}`;
    const config = { maxRequests: 1, windowMs: 1000 };

    checkRateLimit(key, config);

    // Advance time past the window
    vi.advanceTimersByTime(1100);

    const result = checkRateLimit(key, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
    vi.useRealTimers();
  });

  it('returns positive resetIn when limit exceeded', () => {
    const key = `test-resetin-${Date.now()}`;
    const config = { maxRequests: 1, windowMs: 60000 };

    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.success).toBe(false);
    expect(result.resetIn).toBeGreaterThan(0);
    expect(result.resetIn).toBeLessThanOrEqual(60000);
    vi.useRealTimers();
  });
});

describe('getRateLimitKey', () => {
  it('creates namespaced key', () => {
    expect(getRateLimitKey('search', '127.0.0.1')).toBe('search:127.0.0.1');
  });

  it('works with all defined rate limit types', () => {
    for (const type of Object.keys(RATE_LIMITS) as (keyof typeof RATE_LIMITS)[]) {
      expect(getRateLimitKey(type, 'test')).toBe(`${type}:test`);
    }
  });
});
