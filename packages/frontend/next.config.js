/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@derelict/shared'],
  env: {
    NEXT_PUBLIC_DISCORD_APP_ID: process.env.DISCORD_APPLICATION_ID,
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
};

module.exports = nextConfig;
