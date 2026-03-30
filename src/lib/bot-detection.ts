const BOT_PATTERN =
  /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduck|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|redditbot|applebot/i;

/**
 * Returns true if the given User-Agent string belongs to a known search engine
 * crawler or social-media preview bot.
 */
export function isBot(userAgent: string): boolean {
  return BOT_PATTERN.test(userAgent);
}
