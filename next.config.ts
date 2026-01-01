import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Strict Mode is enabled by default in Next.js
  // This causes useEffect to run twice in development
  // DISABLED: Causing issues with game session tracking (multiple sessions created)
  reactStrictMode: false,
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
};

export default nextConfig;
