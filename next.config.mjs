/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
