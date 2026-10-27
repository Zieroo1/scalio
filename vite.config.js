import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // relative base: works at https://<user>.github.io/<repo>/ and locally
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        brand: resolve(import.meta.dirname, 'brand.html'),
      },
    },
  },
});
