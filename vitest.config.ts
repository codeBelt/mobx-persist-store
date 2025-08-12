import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    setupFiles: ['src/test/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/test/**', 'src/**/__tests__/**'],
    },
  },
});
