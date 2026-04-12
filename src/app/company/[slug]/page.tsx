import { cache } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getCompanyBySlug, getCompanyProducts, getCompanyMedia } from '@/lib/company-repository';
import { stackServerApp } from '@/lib/auth';
import { isBot } from '@/lib/bot-detection';
import { Card } from '@/components/ui';
import { StarRating } from '@/components/StarRating';
import { ProductList } from '@/components/ProductList';
import { CompanyLogo } from '@/components/CompanyLogo';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ClaimProfileButton } from '@/components/ClaimProfileModal';
import { RequestInfoButton } from '@/components/RequestInfoButton';
import { MediaGallery } from '@/components/MediaGallery';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { logProfileView } from '@/lib/profile-views';

const CompanyReviews = nextDynamic(
  () => import('./CompanyReviews').then(m => ({ default: m.CompanyReviews })),
  { loading: () => <div className="animate-pulse h-32 bg-zinc-100 rounded-xl" /> }
);

const CompanyInsights = nextDynamic(
  () => import('@/components/CompanyInsights').then(m => ({ default: m.CompanyInsights })),
  { loading: () => <div className="animate-pulse h-32 bg-zinc-100 rounded-xl" /> }
);

/**
 * Safely serialize JSON-LD data for embedding in a <script> tag.
 * Sanitizes all string values to strip HTML tags, then escapes
 * characters that could break out of the script context.
 */
function safeJsonLdSerialize(data: unknown): string {
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      // Strip any HTML tags from string values
      return obj.replace(/<[^>]*>/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, sanitize(v)])
      );
    }
    return obj;
  };

  return JSON.stringify(sanitize(data))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

// Force dynamic rendering — auth gate requires cookies/headers on every request
export const dynamic = 'force-dynamic';

// Cache the company fetch to deduplicate calls between generateMetadata and page
const getCachedCompany = cache(async (slug: string) => {
  return getCompanyBySlug(slug);
});

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await getCachedCompany(params.slug);

  if (!company) {
    return {
      title: 'Company Not Found',
    };
  }

  return {
    title: company.name,
    description: company.description,
    openGraph: {
      title: company.name,
      description: company.description,
      type: 'website',
      images: company.logo ? [company.logo] : [],
    },
  };
}

export default async function CompanyPage({ params }: Props) {
  const company = await getCachedCompany(params.slug);

  if (!company) {
    notFound();
  }

  // Gate: redirect unauthenticated non-bot users to sign-in
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    const headersList = await headers();
    const ua = headersList.get('user-agent') || '';
    if (!isBot(ua)) {
      redirect(`/signin?after_auth_return_to=${encodeURIComponent(`/company/${params.slug}`)}`);
    }
  }

  // Log profile view (fire-and-forget, non-blocking)
  if (stackUser) {
    const headersList = await headers();
    const referer = headersList.get('referer');
    const host = headersList.get('host') || 'localhost';
    getOrCreateUser(stackUser).then(viewerId => {
      if (viewerId && company.claimed_by !== viewerId) {
        logProfileView(company.id, viewerId, referer, host);
      }
    }).catch(() => {
      // Non-critical: don't break page render
    });
  }

  // Resolve user ID for ownership check (needed for Insights tab)
  let currentUserId: string | null = null;
  if (stackUser) {
    try {
      currentUserId = await getOrCreateUser(stackUser);
    } catch {
      // Non-critical
    }
  }

  const products = await getCompanyProducts(company.id);
  const media = await getCompanyMedia(company.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: company.company_url,
    description: company.description,
    logo: company.logo,
    address: {
      '@type': 'PostalAddress',
      addressCountry: company.hq_country,
    },
    aggregateRating: company.average_rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: company.average_rating,
          reviewCount: company.review_count,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdSerialize(jsonLd),
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-zinc-500">
            <li>
              <Link href="/" className="hover:text-zinc-700">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/search" className="hover:text-zinc-700">
                Companies
              </Link>
            </li>
            <li>/</li>
            <li className="text-zinc-900 font-medium">{company.name}</li>
          </ol>
        </nav>

        {/* Company Header */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <CompanyLogo logo={company.logo} name={company.name} size="lg" logo_bg={company.logo_bg} />

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex flex-wrap items-start gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                    {company.name}
                  </h1>
                  {company.claimed_by ? (
                    <VerifiedBadge />
                  ) : company.company_url ? (
                    <ClaimProfileButton companyId={company.id} companySlug={company.slug} companyUrl={company.company_url} />
                  ) : null}
                </div>
                {stackUser?.primaryEmail && (
                  <RequestInfoButton
                    companyId={company.id}
                    companyName={company.name}
                    userEmail={stackUser.primaryEmail}
                  />
                )}
              </div>

              {company.average_rating !== undefined && company.average_rating > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <StarRating rating={company.average_rating} size="md" />
                  <span className="text-zinc-600">
                    {company.average_rating.toFixed(1)} ({company.review_count}{' '}
                    {company.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}

              <p className="text-zinc-600 mb-4">{company.description}</p>

              <div className="flex flex-wrap gap-4">
                {company.company_url && (
                  <a
                    href={company.company_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Visit Website
                  </a>
                )}

                {company.linkedin_profile && (
                  <a
                    href={company.linkedin_profile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                )}

                <span className="text-zinc-500 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {company.hq_country}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Media Section */}
        {media.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Media <span className="text-zinc-400 font-normal text-base">({media.length})</span>
            </h2>
            <MediaGallery media={media} />
          </Card>
        )}

        {/* Products Section */}
        {products.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Products & Services</h2>
            <ProductList products={products} />
          </Card>
        )}

        {/* Reviews Section */}
        <Card>
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">Reviews</h2>
          <CompanyReviews
            companyId={company.id}
            companyName={company.name}
            companySubmittedBy={company.submitted_by}
            companyClaimedBy={company.claimed_by}
          />
        </Card>

        {/* Insights Section — owner only */}
        {currentUserId && company.claimed_by === currentUserId && (
          <Card className="mt-8">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Insights</h2>
            <CompanyInsights companyId={company.id} />
          </Card>
        )}
      </div>
    </>
  );
}
