import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Vite 配置：中立工程模板，开发服务器默认 0.0.0.0:5173
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
