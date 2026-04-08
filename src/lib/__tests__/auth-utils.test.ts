import { describe, it, expect } from 'vitest';
import { maskEmail, isValidWorkEmail } from '../auth-utils';

describe('maskEmail', () => {
  it('masks the local part keeping first character', () => {
    expect(maskEmail('mostafa@company.com')).toBe('m****@company.com');
  });

  it('handles single-character local part', () => {
    expect(maskEmail('m@company.com')).toBe('m****@company.com');
  });

  it('handles short local part', () => {
    expect(maskEmail('ab@company.com')).toBe('a****@company.com');
  });

  it('preserves the full domain', () => {
    expect(maskEmail('user@subdomain.example.com')).toBe('u****@subdomain.example.com');
  });

  it('returns empty string for invalid email', () => {
    expect(maskEmail('notanemail')).toBe('');
    expect(maskEmail('')).toBe('');
  });
});

describe('isValidWorkEmail', () => {
  it('accepts company email domains', () => {
    expect(isValidWorkEmail('user@acme.com')).toBe(true);
    expect(isValidWorkEmail('user@company.co.uk')).toBe(true);
  });

  it('rejects public email domains', () => {
    expect(isValidWorkEmail('user@gmail.com')).toBe(false);
    expect(isValidWorkEmail('user@yahoo.com')).toBe(false);
    expect(isValidWorkEmail('user@outlook.com')).toBe(false);
    expect(isValidWorkEmail('user@hotmail.com')).toBe(false);
    expect(isValidWorkEmail('user@protonmail.com')).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(isValidWorkEmail('notanemail')).toBe(false);
    expect(isValidWorkEmail('')).toBe(false);
    expect(isValidWorkEmail('@domain.com')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isValidWorkEmail('user@Gmail.COM')).toBe(false);
    expect(isValidWorkEmail('USER@Company.com')).toBe(true);
  });
});
