import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent XSS in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Permissions policy — disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    // Scripts: self + Next.js inline scripts (unsafe-inline needed for Next.js)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stack-auth.com https://www.googletagmanager.com",
    // Styles: self + inline styles (Tailwind)
    "style-src 'self' 'unsafe-inline'",
    // Images: self + configured remote patterns
    "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://framerusercontent.com https://media.licdn.com https://www.googletagmanager.com",
    // Fonts: self + Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Connect: self + Supabase + OpenAI (server-side only but CSP applies to client)
    "connect-src 'self' https://*.supabase.co https://*.stack-auth.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://stats.g.doubleclick.net",
    // Frame ancestors: none (same as X-Frame-Options: DENY)
    "frame-ancestors 'none'",
    // Base URI
    "base-uri 'self'",
    // Form actions
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  // Apply to all routes except static files and API routes (API routes set their own headers)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
