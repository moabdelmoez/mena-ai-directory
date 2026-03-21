import { SearchBox } from '@/components/SearchBox';
import { CategoryChips } from '@/components/CategoryChips';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { LogoMarquee } from '@/components/LogoMarquee';
import { FadeIn } from '@/components/ui';
import { getFeaturedCompanyLogos } from '@/lib/company-repository';

export default async function HomePage() {
  const featuredCompanies = await getFeaturedCompanyLogos();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-white to-zinc-50/50 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h1 className="text-fluid-hero tracking-tight text-zinc-800 font-semibold">
              Discover AI Companies in the Arab World
            </h1>
            <p className="mt-6 text-fluid-body text-zinc-500 max-w-2xl mx-auto">
              Your gateway to the Arab AI ecosystem.
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

      {/* Features Section */}
      <section className="py-16 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <FeatureShowcase
            title="Search Smarter"
            description="Find the right AI companies instantly. Our intelligent search understands what you're looking for — not just keywords."
            videoSrc="/videos/search.mp4"
            webmSrc="/videos/search.webm"
          />
          <FeatureShowcase
            title="Browse by Category"
            description="Explore companies by technology, industry, or region. Filter and discover the Arab AI ecosystem at a glance."
            videoSrc="/videos/category.mp4"
            webmSrc="/videos/category.webm"
            reverse
          />
          <FeatureShowcase
            title="Trusted Reviews from Real Users"
            description="Make informed decisions based on authentic feedback from business users who've worked with these companies. Ratings and reviews you can trust."
            imageSrc="/images/reviews-feature.png"
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
              Join the Arab AI Directory and get discovered by potential clients
              and partners across the Arab world.
            </p>
            <a
              href="/register"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors"
            >
              Register Your Company
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
