import { Country } from '@/constants';

interface ParsedQuery {
  cleanedQuery: string;
  extractedCountry?: Country;
  extractedTechCategories: string[];
  extractedIndustries: string[];
}

// Alias maps: lowercase key → canonical value
const COUNTRY_ALIASES: Record<string, Country> = {
  'united arab emirates': 'United Arab Emirates',
  'uae': 'United Arab Emirates',
  'emirates': 'United Arab Emirates',
  'dubai': 'United Arab Emirates',
  'abu dhabi': 'United Arab Emirates',
  'saudi arabia': 'Saudi Arabia',
  'ksa': 'Saudi Arabia',
  'saudi': 'Saudi Arabia',
  'riyadh': 'Saudi Arabia',
  'jeddah': 'Saudi Arabia',
  'qatar': 'Qatar',
  'doha': 'Qatar',
  'egypt': 'Egypt',
  'cairo': 'Egypt',
};

const TECH_CATEGORY_ALIASES: Record<string, string> = {
  'voice ai': 'AI Voice',
  'voice': 'AI Voice',
  'ai voice': 'AI Voice',
  'computer vision': 'AI Vision',
  'image recognition': 'AI Vision',
  'ai vision': 'AI Vision',
  'vision': 'AI Vision',
  'ocr': 'AI Vision',
  'ai analytics': 'AI Analytics',
  'analytics': 'AI Analytics',
  'ai agent': 'AI Agent',
  'chatbot': 'AI Agent',
  'agent': 'AI Agent',
  'gpu cloud': 'GPU Cloud',
  'gpu': 'GPU Cloud',
  'gpu compute management': 'GPU Compute Management',
  'on premise': 'On Prem',
  'on-prem': 'On Prem',
  'on prem': 'On Prem',
};

const INDUSTRY_ALIASES: Record<string, string> = {
  'finance': 'Finance',
  'fintech': 'Finance',
  'banking': 'Finance',
  'insurance': 'Insurance',
  'insurtech': 'Insurance',
  'industrials': 'Industrials',
  'industrial': 'Industrials',
  'manufacturing': 'Industrials',
  'education': 'Education',
  'edtech': 'Education',
  'government': 'Government',
  'gov': 'Government',
  'public sector': 'Government',
  'healthcare': 'Healthcare',
  'health': 'Healthcare',
  'medical': 'Healthcare',
};

const ORPHAN_PREPOSITIONS = /\b(based\s+in|located\s+in|in|from|for)\b/gi;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract matches from text using an alias map.
 * Returns the matched canonical values (deduplicated) and the text with matches removed.
 * When `firstOnly` is true, stops after the first match.
 */
function extractFromAliases(
  text: string,
  aliases: Record<string, string>,
  firstOnly: boolean
): { values: string[]; remaining: string } {
  // Sort keys longest-first to avoid partial matches
  const keys = Object.keys(aliases).sort((a, b) => b.length - a.length);
  const found = new Set<string>();
  let remaining = text;

  for (const key of keys) {
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'gi');
    if (regex.test(remaining)) {
      found.add(aliases[key]);
      remaining = remaining.replace(regex, ' ');
      if (firstOnly) break;
    }
  }

  return { values: [...found], remaining };
}

export function parseSearchQuery(rawQuery: string): ParsedQuery {
  let text = rawQuery.toLowerCase().trim();

  if (!text) {
    return { cleanedQuery: '', extractedTechCategories: [], extractedIndustries: [] };
  }

  // Extract country (first match only)
  const countryResult = extractFromAliases(text, COUNTRY_ALIASES, true);
  text = countryResult.remaining;
  const extractedCountry = countryResult.values[0] as Country | undefined;

  // Extract tech categories (multiple allowed)
  const techResult = extractFromAliases(text, TECH_CATEGORY_ALIASES, false);
  text = techResult.remaining;

  // Extract industries (multiple allowed)
  const industryResult = extractFromAliases(text, INDUSTRY_ALIASES, false);
  text = industryResult.remaining;

  // Strip orphaned prepositions
  text = text.replace(ORPHAN_PREPOSITIONS, ' ');

  // Collapse whitespace and trim
  const cleanedQuery = text.replace(/\s+/g, ' ').trim();

  return {
    cleanedQuery,
    extractedCountry,
    extractedTechCategories: techResult.values,
    extractedIndustries: industryResult.values,
  };
}
