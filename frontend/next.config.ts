import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  devIndicators: false,
  output: 'standalone',
  async rewrites() {
    return [

      {
        source: '/kratos/:path*',
        destination: process.env.KRATOS_INTERNAL_URL
          ? `${process.env.KRATOS_INTERNAL_URL}/:path*`
          : 'http://kratos:4433/:path*',
      },
      {
        source: '/api/secure-view/:path*',
        destination: process.env.VIEWER_URL
          ? `${process.env.VIEWER_URL}/v1/evidence/:path*`
          : 'http://studio-viewer:4001/v1/evidence/:path*',
      },
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/:path*`
          : (process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
            : 'http://studio-backend:4000/api/:path*'),
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
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

export default nextConfig;
