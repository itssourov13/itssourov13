import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'world/**/*.test.ts'],
    environment: 'node',
  },
});
