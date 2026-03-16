import { SearchBox } from '@/components/SearchBox';
import { CategoryChips } from '@/components/CategoryChips';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/ui';

export default function HomePage() {
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

      {/* Features Section */}
      <section className="py-16 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-fluid-title text-center text-zinc-800 font-semibold tracking-tight mb-12">
              Why Use the Arab AI Directory?
            </h2>
          </FadeIn>
          <StaggerChildren className="grid md:grid-cols-3 gap-8">
            <StaggerItem>
              <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">
                  Smart Search
                </h3>
                <p className="text-zinc-500">
                  Find relevant AI companies using our AI-powered semantic search.
                  Search by capabilities, industries, or use cases.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-zinc-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">
                  Curated Listings
                </h3>
                <p className="text-zinc-500">
                  Every company is reviewed before listing. Browse verified AI
                  companies with detailed profiles and user reviews.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-zinc-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">
                  Community Reviews
                </h3>
                <p className="text-zinc-500">
                  Read authentic reviews from users who have worked with these
                  companies. Share your own experiences.
                </p>
              </div>
            </StaggerItem>
          </StaggerChildren>
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
