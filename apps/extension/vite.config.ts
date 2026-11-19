import { defineConfig } from 'vite';
import { resolve } from 'path';
import { build as esbuild } from 'esbuild';

/**
 * Background and sidepanel stay ES modules. Content is rebuilt as a classic
 * IIFE afterward so Chrome can inject it without "import outside a module".
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        sidepanel: resolve(__dirname, 'src/sidepanel/sidepanel.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'formpilot-content-iife',
      closeBundle: {
        sequential: true,
        order: 'post',
        async handler() {
          await esbuild({
            entryPoints: [resolve(__dirname, 'src/content.ts')],
            bundle: true,
            outfile: resolve(__dirname, 'dist/content.js'),
            format: 'iife',
            platform: 'browser',
            target: ['chrome110'],
            logLevel: 'silent',
          });
        },
      },
    },
  ],
});
