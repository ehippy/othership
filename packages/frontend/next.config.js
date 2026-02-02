/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@derelict/shared'],
  ...(process.env.NEXT_OUTPUT_MODE === 'export' && { output: 'export' }),
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_DISCORD_APP_ID: process.env.DISCORD_APPLICATION_ID,
  },
  // Disable Next.js image optimization (we're not using it)
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
};

module.exports = nextConfig;
