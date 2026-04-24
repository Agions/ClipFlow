/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      'src/test/**/fixtures/**',
      'src/_DEAD/__tests__/common.test.ts',
      'src/_DEAD/__tests__/format.test.ts',
      'src/_DEAD/__tests__/logger.test.ts',
      'src/_DEAD/__tests__/model-availability.test.ts',
      'src/_DEAD/__tests__/project-id.test.ts',
      'src/_DEAD/__tests__/route-preload.test.ts',
      'src/services/export.test.ts', // jspdf not installed — add to package.json first
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: ['node_modules', 'src/test', 'src/_DEAD/**', '**/*.d.ts', '**/*.config.*', '**/vite-env.d.ts', 'src/_DEAD/__tests__/common.test.ts', 'src/_DEAD/__tests__/format.test.ts', 'src/_DEAD/__tests__/logger.test.ts', 'src/_DEAD/__tests__/model-availability.test.ts', 'src/_DEAD/__tests__/project-id.test.ts', 'src/_DEAD/__tests__/route-preload.test.ts'],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        // TODO: raise to 50% once component coverage is improved
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    environmentMatchGlobs: [['**/*.test.{ts,tsx}', 'jsdom']],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
