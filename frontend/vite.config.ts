import { defineConfig } from 'vite';

export default defineConfig({
  // ...existing config...
  optimizeDeps: {
    exclude: [
      // ...other excluded deps...
      'chunk-US2YCMZD' // or the actual package name causing the issue
    ]
  }
  // ...existing config...
});