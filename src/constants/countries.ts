export const MENA_COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Egypt',
] as const;

export type Country = typeof MENA_COUNTRIES[number];
