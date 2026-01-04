import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import { securityHeaders, getCSPHeader } from './lib/config/security';

const nextConfig: NextConfig = {
  eslint: {
    // ESLint errors fixed - now enabled during builds
    // Remaining warnings (841) are tracked for incremental cleanup
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TypeScript compilation is now strict - no more hiding TS errors
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
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking (client-side only)
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
      };

      // Split chunks for better caching (client-side only)
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Commons chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }

    // Analyze bundle (run with ANALYZE=true npm run build)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')();
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }

    return config;
  },

  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@stripe/stripe-js', '@stripe/react-stripe-js', 'react-datepicker'],
  },

  // Server-only packages (avoid bundling browser code)
  serverExternalPackages: ['@deepgram/sdk', 'openai', 'stripe', '@anthropic-ai/sdk'],

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production'
      ? {
          exclude: ['error', 'warn'],
        }
      : false,
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
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project slugs from Sentry
  org: process.env.SENTRY_ORG || 'walla-walla-travel',
  project: process.env.SENTRY_PROJECT || 'walla-walla-travel',

  // Auth token for source map upload
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',

  // Suppress build warnings (they're informational)
  hideSourceMaps: true,

  // Disable telemetry
  disableLogger: true,

  // Automatically add release version
  release: {
    create: true,
    finalize: true,
  },
};

// Export with Sentry wrapper (only if auth token is set)
const config = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default config;
