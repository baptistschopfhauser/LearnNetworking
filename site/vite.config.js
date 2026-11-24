import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Source lives in site/. The production build is written to the repository root
// (index.html + assets/) so GitHub Pages "Deploy from branch" serves a working site.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../', import.meta.url)),
    emptyOutDir: false,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 700,
  },
});
