import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
