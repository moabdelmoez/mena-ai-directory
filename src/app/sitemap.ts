import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { COUNTRY_SLUG_MAP } from '@/constants/seo-slugs';
import { getAllTechCategories, slugifyCategory } from '@/lib/category-slug';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bayanbase.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/ai-companies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ai-companies/category`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const countryPages: MetadataRoute.Sitemap = Object.keys(COUNTRY_SLUG_MAP).map((slug) => ({
    url: `${baseUrl}/ai-companies/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const techCategories = await getAllTechCategories().catch(() => [] as string[]);
  const categoryPages: MetadataRoute.Sitemap = techCategories.map((name) => ({
    url: `${baseUrl}/ai-companies/category/${slugifyCategory(name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const landingPages = [...countryPages, ...categoryPages];

  // Try to fetch companies if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return [...staticPages, ...landingPages];
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: companies } = await supabase
      .from('companies')
      .select('slug, updated_at')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false });

    const companyPages: MetadataRoute.Sitemap = (companies || []).map((company) => ({
      url: `${baseUrl}/company/${company.slug}`,
      lastModified: new Date(company.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticPages, ...landingPages, ...companyPages];
  } catch {
    return [...staticPages, ...landingPages];
  }
}
