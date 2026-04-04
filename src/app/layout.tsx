import type { Metadata } from 'next';
import Script from 'next/script';
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
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#FAFAFA" />
        <link rel="icon" type="image/png" href="/images/favicon/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/images/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/images/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="بيان" />
        <link rel="manifest" href="/images/favicon/site.webmanifest" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-[var(--background)]">
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
