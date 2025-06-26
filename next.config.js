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

  // Bundle analyzer for development
  ...(process.env.ANALYZE === 'true' && {
    webpack: config => {
      config.plugins.push(
        require('@next/bundle-analyzer')({
          enabled: true,
        })
      );
      return config;
    },
  }),
};

module.exports = nextConfig;
