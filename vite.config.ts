import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        legacy: 'legacy.html'
      }
    }
  }
});
