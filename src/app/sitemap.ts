import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mena-ai.directory';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Try to fetch companies if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return staticPages;
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

    return [...staticPages, ...companyPages];
  } catch {
    return staticPages;
  }
}
