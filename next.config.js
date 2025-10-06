/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable linting during build to prevent timeout issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable type checking during build to prevent timeout issues
  typescript: {
    ignoreBuildErrors: process.env.SKIP_ENV_VALIDATION === '1',
  },
  // Optimize for Docker builds
  experimental: {
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 1,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
      };
    }
    
    // Optimize for Docker builds
    config.optimization = {
      ...config.optimization,
      minimize: process.env.NODE_ENV === 'production',
    };
    
    return config;
  },
};

module.exports = nextConfig;