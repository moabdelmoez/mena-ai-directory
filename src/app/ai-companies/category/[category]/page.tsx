import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_SLUG_MAP } from '@/constants/seo-slugs';
import { getApprovedCompaniesByCategory } from '@/lib/company-repository';
import { CompanyCard } from '@/components/CompanyCard';

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(CATEGORY_SLUG_MAP).map((category) => ({ category }));
}

interface Props {
  params: { category: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = CATEGORY_SLUG_MAP[params.category];
  if (!name) return { title: 'Not Found' };

  const year = new Date().getFullYear();
  return {
    title: `${name} Companies in the Arab World (${year})`,
    description: `Compare ${name} companies across the Arab world. Reviews, products, and pricing from verified ${name} vendors.`,
    alternates: { canonical: `/ai-companies/category/${params.category}` },
    openGraph: {
      title: `${name} Companies in the Arab World (${year})`,
      description: `Compare ${name} companies across the Arab world.`,
      url: `/ai-companies/category/${params.category}`,
      type: 'website',
    },
  };
}

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export default async function CategoryPage({ params }: Props) {
  const name = CATEGORY_SLUG_MAP[params.category];
  if (!name) notFound();

  const companies = await getApprovedCompaniesByCategory(name);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bayanbase.com';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${name} Companies`,
      url: `${baseUrl}/ai-companies/category/${params.category}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'AI Companies', item: `${baseUrl}/ai-companies` },
        { '@type': 'ListItem', position: 3, name: 'Categories', item: `${baseUrl}/ai-companies/category` },
        { '@type': 'ListItem', position: 4, name, item: `${baseUrl}/ai-companies/category/${params.category}` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav className="mb-6 text-sm text-zinc-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-zinc-700">Home</Link></li>
            <li>/</li>
            <li><Link href="/ai-companies" className="hover:text-zinc-700">AI Companies</Link></li>
            <li>/</li>
            <li><Link href="/ai-companies/category" className="hover:text-zinc-700">Categories</Link></li>
            <li>/</li>
            <li className="text-zinc-900 font-medium">{name}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-fluid-hero font-semibold tracking-tight text-zinc-900">
            {name} Companies in the Arab World
          </h1>
          <p className="mt-3 text-zinc-600 max-w-2xl">
            {companies.length} verified {name.toLowerCase()} {companies.length === 1 ? 'vendor' : 'vendors'} across the Arab world.
          </p>
        </header>

        {companies.length === 0 ? (
          <p className="text-zinc-500">No companies listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
