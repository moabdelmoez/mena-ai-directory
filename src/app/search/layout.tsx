import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse AI Companies in the Arab World',
  description:
    'Search and filter AI companies across Saudi Arabia, UAE, Egypt, and Qatar. Find AI agents, analytics, vision, infrastructure, and more.',
  alternates: {
    canonical: '/search',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
