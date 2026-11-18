/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@formpilot/shared', '@formpilot/context-engine', '@formpilot/dom-analyzer'],
  reactStrictMode: true,
};

module.exports = nextConfig;
