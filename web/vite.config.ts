/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const raizWeb = fileURLToPath(new URL('.', import.meta.url));
const raizRepo = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root: raizWeb,
  plugins: [react(), viteSingleFile()],
  server: {
    // tokens.css e a logo ficam em design-system/, fora de web/
    fs: { allow: [raizRepo] },
  },
  build: {
    // O Apps Script serve um HTML único: apps-script/build/index.html
    outDir: fileURLToPath(new URL('../apps-script/build', import.meta.url)),
    emptyOutDir: false,
  },
  test: {
    root: raizRepo,
    include: ['web/src/**/*.test.ts', 'apps-script/**/*.test.ts'],
  },
});
