/**
 * In-memory LRU cache for OpenAI query embeddings.
 * Avoids redundant API calls for repeated/common search queries.
 * Single-process only (same caveat as rate-limit.ts).
 */

const MAX_SIZE = 500;
const TTL = 1000 * 60 * 60; // 1 hour

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > TTL) {
      cache.delete(key);
    }
  }
}

export function getCachedEmbedding(query: string): number[] | null {
  const normalized = query.toLowerCase().trim();
  const entry = cache.get(normalized);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(normalized);
    return null;
  }

  return entry.embedding;
}

export function setCachedEmbedding(query: string, embedding: number[]): void {
  const normalized = query.toLowerCase().trim();

  // Evict oldest entries if at capacity
  if (cache.size >= MAX_SIZE && !cache.has(normalized)) {
    evictExpired();
    // If still at capacity after evicting expired, remove oldest
    if (cache.size >= MAX_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
  }

  cache.set(normalized, { embedding, timestamp: Date.now() });
}
