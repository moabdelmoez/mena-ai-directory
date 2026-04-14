import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_SLUG_MAP } from '@/constants/seo-slugs';

export const metadata: Metadata = {
  title: 'AI Companies by Category',
  description:
    'Browse AI companies in the Arab world by technology category: AI Agents, AI Analytics, AI Vision, AI Voice, GPU Cloud, and more.',
  alternates: { canonical: '/ai-companies/category' },
};

export default function CategoryIndexPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-10">
        <h1 className="text-fluid-hero font-semibold tracking-tight text-zinc-900">
          AI Companies by Category
        </h1>
        <p className="mt-3 text-zinc-600 max-w-2xl">
          Explore AI vendors across the Arab world grouped by technology category.
        </p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(CATEGORY_SLUG_MAP).map(([slug, name]) => (
          <Link
            key={slug}
            href={`/ai-companies/category/${slug}`}
            className="rounded-2xl border border-zinc-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="text-base font-medium text-zinc-900">{name}</div>
            <div className="mt-1 text-sm text-zinc-500">Browse {name} companies</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
