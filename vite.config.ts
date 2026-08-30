import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // No manualChunks. Every page is lazy-loaded, so rollup already puts recharts
    // behind the overview chunk and sigma/graphology behind the graph chunk. Forcing
    // named vendor chunks here made Vite emit a <link rel="modulepreload"> for them
    // from the entry, which pulled the whole WebGL stack into the initial download --
    // exactly what the code-split was supposed to prevent.
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
