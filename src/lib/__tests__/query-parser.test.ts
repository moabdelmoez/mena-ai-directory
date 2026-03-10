import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from '../query-parser';

describe('parseSearchQuery', () => {
  it('extracts country and tech categories from "voice agent in saudi arabia"', () => {
    const result = parseSearchQuery('voice agent in saudi arabia');
    expect(result.cleanedQuery).toBe('');
    expect(result.extractedCountry).toBe('Saudi Arabia');
    expect(result.extractedTechCategories).toContain('AI Voice');
    expect(result.extractedTechCategories).toContain('AI Agent');
  });

  it('extracts country and tech category from "ocr solution in egypt"', () => {
    const result = parseSearchQuery('ocr solution in egypt');
    expect(result.cleanedQuery).toBe('solution');
    expect(result.extractedCountry).toBe('Egypt');
    expect(result.extractedTechCategories).toContain('AI Vision');
  });

  it('extracts country and industry from "fintech companies in uae"', () => {
    const result = parseSearchQuery('fintech companies in uae');
    expect(result.cleanedQuery).toBe('companies');
    expect(result.extractedCountry).toBe('United Arab Emirates');
    expect(result.extractedIndustries).toContain('Finance');
  });

  it('extracts tech category and industry from "AI analytics for healthcare"', () => {
    const result = parseSearchQuery('AI analytics for healthcare');
    expect(result.cleanedQuery).toBe('');
    expect(result.extractedTechCategories).toContain('AI Analytics');
    expect(result.extractedIndustries).toContain('Healthcare');
    expect(result.extractedCountry).toBeUndefined();
  });

  it('leaves unrecognized queries unchanged', () => {
    const result = parseSearchQuery('best enterprise solution');
    expect(result.cleanedQuery).toBe('best enterprise solution');
    expect(result.extractedCountry).toBeUndefined();
    expect(result.extractedTechCategories).toHaveLength(0);
    expect(result.extractedIndustries).toHaveLength(0);
  });

  it('extracts country from "egypt" alone', () => {
    const result = parseSearchQuery('egypt');
    expect(result.cleanedQuery).toBe('');
    expect(result.extractedCountry).toBe('Egypt');
  });

  it('extracts country from city alias "dubai"', () => {
    const result = parseSearchQuery('dubai');
    expect(result.cleanedQuery).toBe('');
    expect(result.extractedCountry).toBe('United Arab Emirates');
  });

  it('returns empty results for empty string', () => {
    const result = parseSearchQuery('');
    expect(result.cleanedQuery).toBe('');
    expect(result.extractedCountry).toBeUndefined();
    expect(result.extractedTechCategories).toHaveLength(0);
    expect(result.extractedIndustries).toHaveLength(0);
  });

  it('handles "computer vision" without partial-matching "vision" separately', () => {
    const result = parseSearchQuery('computer vision companies');
    expect(result.extractedTechCategories).toEqual(['AI Vision']);
    expect(result.cleanedQuery).toBe('companies');
  });

  it('strips orphaned prepositions', () => {
    const result = parseSearchQuery('companies based in uae');
    expect(result.cleanedQuery).toBe('companies');
    expect(result.extractedCountry).toBe('United Arab Emirates');
  });

  it('handles multiple industries', () => {
    const result = parseSearchQuery('fintech healthcare solution');
    expect(result.extractedIndustries).toContain('Finance');
    expect(result.extractedIndustries).toContain('Healthcare');
    expect(result.cleanedQuery).toBe('solution');
  });

  it('is case-insensitive', () => {
    const result = parseSearchQuery('OCR Solution In EGYPT');
    expect(result.extractedCountry).toBe('Egypt');
    expect(result.extractedTechCategories).toContain('AI Vision');
    expect(result.cleanedQuery).toBe('solution');
  });

  it('handles "voice ai" longer alias before "voice"', () => {
    const result = parseSearchQuery('voice ai platform');
    expect(result.extractedTechCategories).toEqual(['AI Voice']);
    expect(result.cleanedQuery).toBe('platform');
  });
});
