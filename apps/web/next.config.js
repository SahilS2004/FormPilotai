/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@formpilot/shared', '@formpilot/context-engine'],
  reactStrictMode: true
};

module.exports = nextConfig;
