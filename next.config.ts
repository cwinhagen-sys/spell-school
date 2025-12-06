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
  
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  // Empty config to silence the warning about webpack config
  turbopack: {},
  
  // Webpack optimizations (for compatibility, but Turbopack is preferred in Next.js 16)
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize bundle size
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
