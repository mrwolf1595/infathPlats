/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/generate-pdf': ['./public/fonts/**/*', './public/templates/**/*'],
    },
  },
};

export default nextConfig;
