export const TAGS = [
  'AI Agent',
  'AI Analytics',
  'AI Vision',
  'AI Voice',
  'GPU Cloud',
  'GPU Compute Management',
  'On Prem'
] as const;

export type Tag = typeof TAGS[number];
