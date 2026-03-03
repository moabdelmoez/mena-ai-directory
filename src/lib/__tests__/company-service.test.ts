import { describe, it, expect } from 'vitest';
import { validateLogo, parseAndValidateProducts, getFormString, getFormStringOrNull, getFormFile, getFormStringArray } from '../company-service';

describe('validateLogo', () => {
  it('accepts valid PNG', () => {
    const file = new File(['data'], 'logo.png', { type: 'image/png' });
    expect(validateLogo(file)).toBeNull();
  });

  it('accepts valid JPEG', () => {
    const file = new File(['data'], 'logo.jpg', { type: 'image/jpeg' });
    expect(validateLogo(file)).toBeNull();
  });

  it('accepts valid WebP', () => {
    const file = new File(['data'], 'logo.webp', { type: 'image/webp' });
    expect(validateLogo(file)).toBeNull();
  });

  it('rejects invalid type', () => {
    const file = new File(['data'], 'logo.gif', { type: 'image/gif' });
    expect(validateLogo(file)).toContain('Invalid logo type');
  });

  it('rejects oversized file', () => {
    // Create a file > 2MB
    const largeData = new Uint8Array(2.1 * 1024 * 1024);
    const file = new File([largeData], 'large.png', { type: 'image/png' });
    expect(validateLogo(file)).toContain('less than 2MB');
  });
});

describe('parseAndValidateProducts', () => {
  it('parses valid products array', () => {
    const json = JSON.stringify([
      { name: 'Product 1', description: 'Desc 1' },
      { name: 'Product 2', description: 'Desc 2' },
    ]);
    const result = parseAndValidateProducts(json);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Product 1');
  });

  it('throws for non-array input', () => {
    expect(() => parseAndValidateProducts('{"name": "test"}')).toThrow('Products must be an array');
  });

  it('throws for missing name', () => {
    const json = JSON.stringify([{ description: 'Desc' }]);
    expect(() => parseAndValidateProducts(json)).toThrow('Each product must have a name and description');
  });

  it('throws for missing description', () => {
    const json = JSON.stringify([{ name: 'Test' }]);
    expect(() => parseAndValidateProducts(json)).toThrow('Each product must have a name and description');
  });

  it('accepts empty array', () => {
    const result = parseAndValidateProducts('[]');
    expect(result).toEqual([]);
  });

  it('throws for invalid JSON', () => {
    expect(() => parseAndValidateProducts('not json')).toThrow();
  });
});

describe('FormData helpers', () => {
  describe('getFormString', () => {
    it('returns string value', () => {
      const fd = new FormData();
      fd.set('key', 'value');
      expect(getFormString(fd, 'key')).toBe('value');
    });

    it('returns empty string for missing key', () => {
      const fd = new FormData();
      expect(getFormString(fd, 'missing')).toBe('');
    });

    it('returns empty string for File value', () => {
      const fd = new FormData();
      fd.set('file', new File(['data'], 'test.txt'));
      expect(getFormString(fd, 'file')).toBe('');
    });
  });

  describe('getFormStringOrNull', () => {
    it('returns string value', () => {
      const fd = new FormData();
      fd.set('key', 'value');
      expect(getFormStringOrNull(fd, 'key')).toBe('value');
    });

    it('returns null for missing key', () => {
      const fd = new FormData();
      expect(getFormStringOrNull(fd, 'missing')).toBeNull();
    });
  });

  describe('getFormFile', () => {
    it('returns File when present', () => {
      const fd = new FormData();
      const file = new File(['data'], 'test.txt');
      fd.set('file', file);
      expect(getFormFile(fd, 'file')).toBeInstanceOf(File);
    });

    it('returns null for string value', () => {
      const fd = new FormData();
      fd.set('key', 'string');
      expect(getFormFile(fd, 'key')).toBeNull();
    });

    it('returns null for missing key', () => {
      const fd = new FormData();
      expect(getFormFile(fd, 'missing')).toBeNull();
    });
  });

  describe('getFormStringArray', () => {
    it('returns array of strings', () => {
      const fd = new FormData();
      fd.append('tags', 'a');
      fd.append('tags', 'b');
      expect(getFormStringArray(fd, 'tags')).toEqual(['a', 'b']);
    });

    it('returns empty array for missing key', () => {
      const fd = new FormData();
      expect(getFormStringArray(fd, 'missing')).toEqual([]);
    });
  });
});
