import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // harfbuzzjs uses top-level await and locates its .wasm with import.meta.url
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' },
});
