import { describe, it, expect } from 'vitest';
import { generateSlug, generateUniqueSlug, classNames, truncateText, formatDate } from '../utils';

describe('generateSlug', () => {
  it('converts name to lowercase kebab-case', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(generateSlug('AI & ML Company!')).toBe('ai-ml-company');
  });

  it('collapses multiple separators', () => {
    expect(generateSlug('foo---bar   baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(generateSlug('--hello--')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles unicode/Arabic characters by stripping them', () => {
    expect(generateSlug('شركة AI Company')).toBe('ai-company');
  });
});

describe('generateUniqueSlug', () => {
  it('returns base slug when no conflicts', () => {
    expect(generateUniqueSlug('Hello World', ['foo', 'bar'])).toBe('hello-world');
  });

  it('appends counter when slug exists', () => {
    expect(generateUniqueSlug('Hello World', ['hello-world'])).toBe('hello-world-1');
  });

  it('increments counter for multiple conflicts', () => {
    expect(generateUniqueSlug('Test', ['test', 'test-1', 'test-2'])).toBe('test-3');
  });

  it('handles empty existing slugs', () => {
    expect(generateUniqueSlug('Test', [])).toBe('test');
  });
});

describe('classNames', () => {
  it('joins truthy class names', () => {
    expect(classNames('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(classNames('foo', false, undefined, null, 'bar')).toBe('foo bar');
  });

  it('returns empty string for no truthy values', () => {
    expect(classNames(false, undefined, null)).toBe('');
  });
});

describe('truncateText', () => {
  it('returns text unchanged if within limit', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('truncates and adds ellipsis for long text', () => {
    expect(truncateText('Hello World', 8)).toBe('Hello...');
  });

  it('handles exact length', () => {
    expect(truncateText('Hello', 5)).toBe('Hello');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2024-06-01'));
    expect(result).toContain('2024');
  });
});
