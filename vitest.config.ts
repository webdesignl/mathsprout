import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The database tests build a Postgres in memory and apply every migration. That takes a few seconds on a
    // busy CI machine (many test files run at once, with coverage on), so the 5 second default is too tight.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
