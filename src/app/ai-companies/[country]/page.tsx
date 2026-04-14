import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COUNTRY_SLUG_MAP } from '@/constants/seo-slugs';
import { getApprovedCompaniesByCountry } from '@/lib/company-repository';
import { CompanyCard } from '@/components/CompanyCard';

export const dynamic = 'force-dynamic';

interface Props {
  params: { country: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = COUNTRY_SLUG_MAP[params.country];
  if (!name) return { title: 'Not Found' };

  const year = new Date().getFullYear();
  return {
    title: `AI Companies in ${name} (${year})`,
    description: `Discover top AI companies headquartered in ${name}. Browse AI agents, analytics, vision, and infrastructure vendors with verified reviews.`,
    alternates: { canonical: `/ai-companies/${params.country}` },
    openGraph: {
      title: `AI Companies in ${name} (${year})`,
      description: `Discover top AI companies headquartered in ${name}.`,
      url: `/ai-companies/${params.country}`,
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

export default async function CountryPage({ params }: Props) {
  const name = COUNTRY_SLUG_MAP[params.country];
  if (!name) notFound();

  const companies = await getApprovedCompaniesByCountry(name);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bayanbase.com';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `AI Companies in ${name}`,
      url: `${baseUrl}/ai-companies/${params.country}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'AI Companies', item: `${baseUrl}/ai-companies` },
        { '@type': 'ListItem', position: 3, name, item: `${baseUrl}/ai-companies/${params.country}` },
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
            <li className="text-zinc-900 font-medium">{name}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-fluid-hero font-semibold tracking-tight text-zinc-900">
            AI Companies in {name}
          </h1>
          <p className="mt-3 text-zinc-600 max-w-2xl">
            {companies.length} verified AI {companies.length === 1 ? 'company' : 'companies'} headquartered in {name}.
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
