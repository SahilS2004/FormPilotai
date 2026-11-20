const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    transpilePackages: ['@formpilot/shared', '@formpilot/context-engine', '@formpilot/dom-analyzer'],
    reactStrictMode: true,
    distDir: isDev ? '.next-dev' : '.next',
    experimental: {
      instrumentationHook: true,
      serverComponentsExternalPackages: [
        '@xenova/transformers',
        'onnxruntime-node',
        'sharp',
        'unpdf',
        'mammoth',
        'jszip',
      ],
    },
  };
};

module.exports = nextConfig;
