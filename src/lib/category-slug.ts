import { supabaseAdmin } from '@/lib/supabase';

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export async function getAllTechCategories(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('product_classification')
    .select('tech_category')
    .not('tech_category', 'is', null);

  const unique = [...new Set((data || []).map((r) => r.tech_category) as string[])];
  return unique.sort((a, b) => a.localeCompare(b));
}

export async function resolveCategorySlug(slug: string): Promise<string | null> {
  const categories = await getAllTechCategories();
  return categories.find((name) => slugifyCategory(name) === slug) ?? null;
}
