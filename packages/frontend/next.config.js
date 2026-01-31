/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@derelict/shared'],
  env: {
    NEXT_PUBLIC_DISCORD_APP_ID: process.env.DISCORD_APPLICATION_ID,
  },
  webpack: (config) => {
    // Pixi.js requires WebGL and canvas support
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
