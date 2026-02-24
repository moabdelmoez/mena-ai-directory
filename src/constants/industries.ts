export const INDUSTRIES = [
  'Finance',
  'Insurance',
  'Industrials',
  'Education',
  'Government',
  'Healthcare'
] as const;

export type Industry = typeof INDUSTRIES[number];
