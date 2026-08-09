import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    include: ['src/__tests__/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }, // يشارك جميع الاختبارات نفس اتصال Postgres/Redis بدون تضارب منافذ
    },
  },
});
