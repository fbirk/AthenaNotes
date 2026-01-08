import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  plugins: [
    electron([
      {
        entry: '../main/main.js',
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist-electron'),
          },
        },
      },
      {
        entry: '../main/preload.js',
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist-electron'),
          },
        },
        onstart(args) {
          // Notify the Renderer process to reload the page when the Preload scripts build is complete
          args.reload();
        },
      },
    ]),
  ],
});
