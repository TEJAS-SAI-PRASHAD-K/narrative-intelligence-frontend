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
    rollupOptions: {
      output: {
        // Keep the WebGL graph stack out of the initial bundle. Acceptance criterion:
        // initial JS < 400KB gzipped with the graph page code-split out of it.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('sigma') || id.includes('graphology')) return 'graph-vendor';
          if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
