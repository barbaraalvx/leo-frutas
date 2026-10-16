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
    // O Apps Script serve um HTML único: apps-script/index.html
    outDir: fileURLToPath(new URL('../apps-script', import.meta.url)),
    emptyOutDir: false,
  },
  test: {
    root: raizWeb,
    include: ['src/**/*.test.ts'],
  },
});
