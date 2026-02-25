import type { NextConfig } from 'next'
import { securityHeaders, getCSPHeader } from './lib/config/security'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ============================================================================
  // BUNDLE OPTIMIZATION
  // ============================================================================
  
  // Enable production optimizations
  productionBrowserSourceMaps: false, // Disable source maps in production
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // Supabase Storage for winery photos
        protocol: 'https',
        hostname: 'eabqmcvmpkbpyhhpbcij.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Analyze bundle (run with ANALYZE=true npm run build)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')();
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      );
    }

    return config;
  },
  
  // Server-only packages that should not be bundled by webpack
  serverExternalPackages: ['pdf-parse'],

  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      'react-datepicker',
    ],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Headers for caching and security
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Content-Security-Policy',
            value: getCSPHeader(),
          },
        ],
      },
      // Cache headers for static assets
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API headers
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
}

export default nextConfig