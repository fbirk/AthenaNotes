import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  plugins: [
    electron([
      {
        entry: 'src/main/main.js',
      },
      {
        entry: 'src/main/preload.js',
        onstart(options) {
          if (options.reload) {
            options.reload();
          }
        },
      },
    ]),
  ],
});
