import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/js/index.js'),
      name: 'LeafletAtlas',
      formats: ['es', 'umd'],
      fileName: 'leaflet-atlas',
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L',
        },
        assetFileNames: 'leaflet-atlas.[ext]',
      },
    },
  },
});
