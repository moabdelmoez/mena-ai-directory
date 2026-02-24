import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/search';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { SearchFilters } from '@/types';
import { Country } from '@/constants';

export async function GET(request: NextRequest) {
  // Rate limiting (skip in development)
  const isDev = process.env.NODE_ENV === 'development';
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitKey = getRateLimitKey('search', ip);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.search);

  if (!rateLimit.success && !isDev) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;

  const filters: SearchFilters = {
    query: searchParams.get('q') || undefined,
    derived_capabilities: searchParams.getAll('derived_capabilities') || undefined,
    domain_verticals: searchParams.getAll('domain_verticals') || undefined,
    hq_country: (searchParams.get('hq_country') as Country) || undefined,
    ai_infrastructure: searchParams.get('ai_infrastructure') === 'true' ? true : undefined,
    ai_platform: searchParams.get('ai_platform') === 'true' ? true : undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: Math.min(parseInt(searchParams.get('limit') || '10', 10), 50),
  };

  try {
    const results = await hybridSearch(filters);

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    const isConnectionError = message.includes('connect') || message.includes('timeout') || message.includes('internet');
    return NextResponse.json(
      {
        error: message,
        isConnectionError,
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
