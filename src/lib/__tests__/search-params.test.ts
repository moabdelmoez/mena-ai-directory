import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing search module
const {
  mockRpc,
  createFromMock,
} = vi.hoisted(() => {
  const mockOrResponse = Promise.resolve({ data: [], error: null });
  const mockRangeResponse = Promise.resolve({ data: [], error: null, count: 0 });

  const createInMock = () => ({
    or: () => mockOrResponse,
  });

  const createOrderMock = () => ({
    range: () => mockRangeResponse,
  });

  const createEqMock = () => ({
    order: createOrderMock,
  });

  const createSelectMock = () => ({
    in: createInMock,
    eq: createEqMock,
  });

  const createFromMock = () => ({
    select: createSelectMock,
  });

  const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

  return { mockRpc, createFromMock };
});

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: createFromMock,
  },
}));

vi.mock('../openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0)),
}));

vi.mock('../embedding-cache', () => ({
  getCachedEmbedding: vi.fn().mockReturnValue(null),
  setCachedEmbedding: vi.fn(),
}));

import { hybridSearch } from '../search';

describe('hybridSearch RPC params', () => {
  beforeEach(() => {
    mockRpc.mockClear();
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('passes extracted tech categories from query parser', async () => {
    await hybridSearch({ query: 'ocr solution in egypt' });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_companies_with_products',
      expect.objectContaining({
        filter_tech_categories: expect.arrayContaining(['AI Vision']),
        filter_hq_country: 'Egypt',
      })
    );
  });

  it('passes null classification filters when no categories extracted', async () => {
    await hybridSearch({ query: 'best company reviews' });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_companies_with_products',
      expect.objectContaining({
        filter_tech_categories: null,
        filter_industries: null,
      })
    );
  });

  it('uses explicit filter over extracted classification', async () => {
    await hybridSearch({
      query: 'ocr solution in egypt',
      tech_categories: ['NLP'],
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_companies_with_products',
      expect.objectContaining({
        filter_tech_categories: ['NLP'],
      })
    );
  });

  it('passes industry filters when provided', async () => {
    await hybridSearch({
      query: 'fintech companies in uae',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_companies_with_products',
      expect.objectContaining({
        filter_industries: expect.arrayContaining(['Finance']),
        filter_hq_country: 'United Arab Emirates',
      })
    );
  });
});
