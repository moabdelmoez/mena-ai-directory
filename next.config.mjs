import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase storage (covers all Supabase project URLs)
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      // Google user avatars (OAuth)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Google user avatars (alternative)
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      // Framer hosted images (company logos)
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
      },
      // LinkedIn profile images
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
      },
      // Cloudflare R2 (media uploads)
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'framer-motion', '@stackframe/stack', 'openai', 'recharts'],
  },
  compress: true,
  poweredByHeader: false,
};

export default withBundleAnalyzer(nextConfig);
