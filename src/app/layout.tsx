import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { LayoutShell } from '@/components/LayoutShell';

export const metadata: Metadata = {
  title: {
    default: 'BayanBase - Discover AI Companies in the Arab World',
    template: '%s | BayanBase',
  },
  description:
    'Discover and connect with AI companies across the Arab world. Browse AI infrastructure, platforms, and vertical applications in UAE, Saudi Arabia, Qatar, Egypt, and Jordan.',
  keywords: [
    'AI companies',
    'BayanBase',
    'Arab world AI',
    'AI directory',
    'UAE AI',
    'Saudi Arabia AI',
    'AI startups',
    'AI platforms',
  ],
  openGraph: {
    title: 'BayanBase',
    description:
      'Discover and connect with AI companies across the Arab world.',
    url: 'https://mena-ai.directory',
    siteName: 'BayanBase',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BayanBase',
    description:
      'Discover and connect with AI companies across the Arab world.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-[var(--background)]">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
