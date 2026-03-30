import { describe, it, expect } from 'vitest';
import { isBot } from '../bot-detection';

describe('isBot', () => {
  it.each([
    ['Googlebot/2.1 (+http://www.google.com/bot.html)'],
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
    ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
    ['Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'],
    ['Baiduspider+(+http://www.baidu.com/search/spider.htm)'],
    ['DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)'],
    ['facebookexternalhit/1.1'],
    ['Twitterbot/1.0'],
    ['LinkedInBot/1.0'],
    ['Applebot/0.1; +http://www.apple.com/go/applebot'],
    ['redditbot/1.0'],
    ['pinterest/0.2 (+http://www.pinterest.com/)'],
    ['Embedly (+http://embed.ly)'],
    ['Quora Link Preview/1.0'],
    ['Sogou web spider/4.0'],
    ['AhrefsBot/7.0'],
  ])('returns true for bot UA: %s', (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'],
  ])('returns false for browser UA: %s', (ua) => {
    expect(isBot(ua)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBot('')).toBe(false);
  });
});
