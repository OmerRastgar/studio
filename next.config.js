/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pg']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'pg' on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        pg: false,
        'pg-native': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;