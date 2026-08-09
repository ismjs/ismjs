import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      // Generated vocabularies are data, not logic
      // See docs/adr/0003-vocabularies-are-generated-and-committed.md
      exclude: ['**/src/generated/**', '**/src/index.ts'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
})
