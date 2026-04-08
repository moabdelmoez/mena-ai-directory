import { getEmailDomain, isPublicEmailDomain } from './domain-utils';

/**
 * Mask an email address for display: "mostafa@company.com" → "m****@company.com"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return '';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  return `${local[0]}****${domain}`;
}

/**
 * Check if an email is a valid work email (not a public/free provider).
 * Returns false for public domains like gmail.com, yahoo.com, etc.
 */
export function isValidWorkEmail(email: string): boolean {
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return false; // No @ or @ at start (no local part)
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return !isPublicEmailDomain(domain);
}
