import type { Metadata } from 'next';
import Link from 'next/link';
import { COUNTRY_SLUG_MAP } from '@/constants/seo-slugs';
import { getAllTechCategories, slugifyCategory } from '@/lib/category-slug';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AI Companies in the Arab World - Browse by Country & Category',
  description:
    'Browse AI companies across Saudi Arabia, UAE, Egypt, and Qatar. Explore by technology category: AI Agents, AI Analytics, AI Vision, GPU Cloud, and more.',
  alternates: { canonical: '/ai-companies' },
};

export default async function AiCompaniesHubPage() {
  const categories = await getAllTechCategories();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-12 text-center">
        <h1 className="text-fluid-hero font-semibold tracking-tight text-zinc-900">
          AI Companies in the Arab World
        </h1>
        <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
          Browse the Arab world&apos;s AI ecosystem by country or technology
          category. Find verified AI vendors with real reviews from business users.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-6">
          Browse by Country
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(COUNTRY_SLUG_MAP).map(([slug, name]) => (
            <Link
              key={slug}
              href={`/ai-companies/${slug}`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="text-base font-medium text-zinc-900">
                AI Companies in {name}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-zinc-900 mb-6">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((name) => {
            const slug = slugifyCategory(name);
            return (
              <Link
                key={slug}
                href={`/ai-companies/category/${slug}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="text-base font-medium text-zinc-900">{name}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  Browse {name} companies
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
