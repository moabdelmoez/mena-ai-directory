import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'We are building the missing layer of the Arab world\'s AI ecosystem. Discover how BayanBase connects businesses with AI companies across the MENA region.',
  openGraph: {
    title: 'About Us',
    description:
      'We are building the missing layer of the Arab world\'s AI ecosystem. Discover how BayanBase connects businesses with AI companies across the MENA region.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
