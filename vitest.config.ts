import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Coverage configuration - only when explicitly requested
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    //   exclude: [
    //     'node_modules/',
    //     'src/**/*.d.ts',
    //     'src/**/*.test.{ts,tsx}',
    //     'src/**/*.spec.{ts,tsx}',
    //   ],
    // },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
