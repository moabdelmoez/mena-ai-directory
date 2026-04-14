import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { CategoryChips } from '@/components/CategoryChips';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { LogoMarquee } from '@/components/LogoMarquee';
import { FadeIn } from '@/components/ui';
import { getFeaturedCompanyLogos } from '@/lib/company-repository';
import { COUNTRY_SLUG_MAP } from '@/constants/seo-slugs';
import { getAllTechCategories, slugifyCategory } from '@/lib/category-slug';

const WEBSITE_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'BayanBase',
  url: 'https://www.bayanbase.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://www.bayanbase.com/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featuredCompanies, techCategories] = await Promise.all([
    getFeaturedCompanyLogos(),
    getAllTechCategories().catch(() => [] as string[]),
  ]);

  return (
    <div className="flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: WEBSITE_JSON_LD }} />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-white to-zinc-50/50 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h1 className="text-fluid-hero tracking-tight text-zinc-800 font-semibold">
              Discover AI Companies in the Arab World
            </h1>
            <p className="mt-6 text-fluid-body text-zinc-500 max-w-2xl mx-auto">
              Your gateway to the Arab world&apos;s AI ecosystem.
              Browse and connect with innovative AI companies across the Arab world.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-10 max-w-2xl mx-auto">
              <SearchBox size="lg" />
            </div>

            <div className="mt-8">
              <CategoryChips />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Logo Marquee */}
      <LogoMarquee companies={featuredCompanies} />

      {/* SEO landing page links */}
      <section className="py-12 bg-[var(--background)] border-t border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Browse by Country
              </h2>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(COUNTRY_SLUG_MAP).map(([slug, name]) => (
                  <li key={slug}>
                    <Link
                      href={`/ai-companies/${slug}`}
                      className="inline-block px-3 py-1.5 rounded-full text-sm text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-400 transition-colors"
                    >
                      AI Companies in {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Browse by Category
              </h2>
              <ul className="flex flex-wrap gap-2">
                {techCategories.map((name) => {
                  const slug = slugifyCategory(name);
                  return (
                    <li key={slug}>
                      <Link
                        href={`/ai-companies/category/${slug}`}
                        className="inline-block px-3 py-1.5 rounded-full text-sm text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-400 transition-colors"
                      >
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <FeatureShowcase
            title="Search Smarter"
            description="Find the right AI companies instantly. Our intelligent search understands what you're looking for — not just keywords."
            videoSrc="/videos/searchv2.mp4"
            webmSrc="/videos/searchv2.webm"
          />
          <FeatureShowcase
            title="Browse by Category"
            description="Explore companies by technology, industry, or region. Filter and discover the Arab world's AI ecosystem at a glance."
            videoSrc="/videos/filterv2.mp4"
            webmSrc="/videos/filterv2.webm"
            reverse
          />
          <FeatureShowcase
            title="Trusted Reviews from Real Users"
            description="Make informed decisions based on authentic feedback from business users who've worked with these companies. Ratings and reviews you can trust."
            imageSrc="/images/review.png"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[var(--background)] border-t border-zinc-100">
        <FadeIn>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-fluid-title text-zinc-800 font-semibold tracking-tight mb-4">
              List Your AI Company
            </h2>
            <p className="text-zinc-500 text-lg mb-8">
              Join BayanBase and get discovered by potential clients
              and partners across the Arab world.
            </p>
            <a
              href="/register"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2"
            >
              Register Your Company
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
