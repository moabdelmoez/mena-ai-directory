import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register Your AI Company',
  description:
    'List your AI company on BayanBase, the Arab world\'s AI directory. Get discovered by businesses looking for AI solutions in Saudi Arabia, UAE, Egypt, and Qatar.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
