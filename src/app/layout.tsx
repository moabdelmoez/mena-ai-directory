import type { Metadata } from 'next';
import { Space_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MENA AI Directory - Discover AI Companies in the Middle East',
    template: '%s | MENA AI Directory',
  },
  description:
    'Discover and connect with AI companies across the Middle East and North Africa. Browse AI infrastructure, platforms, and vertical applications in UAE, Saudi Arabia, Qatar, Egypt, and Jordan.',
  keywords: [
    'AI companies',
    'MENA AI',
    'Middle East AI',
    'AI directory',
    'UAE AI',
    'Saudi Arabia AI',
    'AI startups',
    'AI platforms',
  ],
  openGraph: {
    title: 'MENA AI Directory',
    description:
      'Discover and connect with AI companies across the Middle East and North Africa.',
    url: 'https://mena-ai.directory',
    siteName: 'MENA AI Directory',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MENA AI Directory',
    description:
      'Discover and connect with AI companies across the Middle East and North Africa.',
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
      <body className={`${spaceMono.variable} font-mono antialiased min-h-screen flex flex-col bg-white`}>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
