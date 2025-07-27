/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },

  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Compression
  compress: true,

  // Webpack configuration
  webpack: config => {
    // Add alias for next-auth/react compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      'next-auth/react': require.resolve('./src/lib/auth/nextauth-compat.ts'),
    };

    // Bundle analyzer for development
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        require('@next/bundle-analyzer')({
          enabled: true,
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
