import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// --mode offline: نسخة الملف الواحد — كل شيء مضمّن (scripts/make-offline.mjs يكمل الدمج)
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    // harfbuzzjs uses top-level await and locates its .wasm with import.meta.url
    optimizeDeps: { exclude: ['harfbuzzjs'] },
    build: offline
      ? {
          target: 'es2022',
          outDir: 'dist-offline',
          copyPublicDir: false,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          rolldownOptions: { output: { codeSplitting: false } },
        }
      : { target: 'es2022' },
    esbuild: { target: 'es2022' },
  };
});
