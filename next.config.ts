import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/generate-pdf': ['./public/fonts/**/*', './public/templates/**/*'],
    },
  },
};

export default nextConfig;
