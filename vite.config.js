import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  root: 'src',
  publicDir: resolve(__dirname, 'public'),
  optimizeDeps: {
    exclude: ['@jsquash/jpeg', '@jsquash/webp', '@jsquash/png', 'wasm-feature-detect'],
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        compress: resolve(__dirname, 'src/compress.html'),
        merge: resolve(__dirname, 'src/merge.html'),
        'pdf-to-image': resolve(__dirname, 'src/pdf-to-image.html'),
        'images-to-pdf': resolve(__dirname, 'src/images-to-pdf.html'),
        edit: resolve(__dirname, 'src/edit.html'),
        privacy: resolve(__dirname, 'src/privacy.html'),
      },
      // wasm-feature-detect uses dynamic data: WASM imports; leave them to the browser
      external: (id) => id.startsWith('data:'),
    },
  },
  assetsInclude: ['**/*.wasm'],
});
