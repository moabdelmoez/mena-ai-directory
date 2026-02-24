import { cache } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompanyBySlug, getCompanyProducts } from '@/lib/search';
import { Badge, Card } from '@/components/ui';
import { TagBadges } from '@/components/TagBadges';
import { StarRating } from '@/components/StarRating';
import { CompanyReviews } from './CompanyReviews';
import { ProductList } from '@/components/ProductList';
import { CompanyLogo } from '@/components/CompanyLogo';

// ISR: Revalidate company pages every hour
export const revalidate = 3600;

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

  const products = await getCompanyProducts(company.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: company.website,
    description: company.description,
    logo: company.logo,
    address: {
      '@type': 'PostalAddress',
      addressCountry: company.hq_country,
      addressRegion: company.hq_region,
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
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/search" className="hover:text-gray-700">
                Companies
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{company.name}</li>
          </ol>
        </nav>

        {/* Company Header */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <CompanyLogo logo={company.logo} name={company.name} size="lg" />

            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {company.name}
                </h1>
                {company.ai_infrastructure && (
                  <Badge variant="default" size="md">
                    AI Infrastructure
                  </Badge>
                )}
                {company.ai_platform && (
                  <Badge variant="primary" size="md">
                    AI Platform
                  </Badge>
                )}
              </div>

              {company.average_rating !== undefined && company.average_rating > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <StarRating rating={company.average_rating} size="md" />
                  <span className="text-gray-600">
                    {company.average_rating.toFixed(1)} ({company.review_count}{' '}
                    {company.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}

              <p className="text-gray-600 mb-4">{company.description}</p>

              <div className="flex flex-wrap gap-4">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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

                <span className="text-gray-500 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  {company.hq_region && `, ${company.hq_region}`}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Capabilities and Verticals */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {company.derived_capabilities.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Capabilities</h2>
              <TagBadges tags={company.derived_capabilities} variant="primary" />
            </Card>
          )}

          {company.domain_verticals.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Target Industries</h2>
              <TagBadges tags={company.domain_verticals} variant="default" />
            </Card>
          )}
        </div>

        {/* Products Section */}
        {products.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Products & Services</h2>
            <ProductList products={products} />
          </Card>
        )}

        {/* Reviews Section */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Reviews</h2>
          <CompanyReviews companyId={company.id} />
        </Card>
      </div>
    </>
  );
}
