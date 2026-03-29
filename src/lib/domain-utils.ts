const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'msn.com',
  'protonmail.com',
  'proton.me',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
  'tutanota.com',
  'fastmail.com',
  'hey.com',
]);

/**
 * Extract the registrable domain from a URL string.
 * Strips www. prefix and returns lowercase domain.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if a domain is a public/free email provider.
 */
export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Extract the domain from an email address.
 */
export function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return (parts[1] || '').toLowerCase();
}

/**
 * Check if an email's domain matches the company's website domain.
 */
export function emailMatchesCompanyDomain(companyUrl: string, email: string): boolean {
  const companyDomain = extractDomain(companyUrl);
  const emailDomain = getEmailDomain(email);

  if (!companyDomain || !emailDomain) return false;
  if (isPublicEmailDomain(emailDomain)) return false;

  return emailDomain === companyDomain;
}
