import { defineConfig } from 'tsdown'

export default defineConfig([
  // The npm artifact: ESM + CJS + types.
  {
    entry: ['src/index.ts', 'src/descriptions.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    treeshake: true,
    sourcemap: true,
    target: 'node24',
    // `export * as tokens` needs a helper, which rolldown emits as a shared
    // chunk beside the entry point. Naming it explicitly keeps `dist/` the same
    // from one build to the next; the default is content-hashed, so an
    // unrelated change to the helper would rename a published file.
    outputOptions: { chunkFileNames: 'runtime.mjs' },
  },
  // The vendorable artifact: one self-contained file with no dependencies, for
  // consumers on networks that cannot reach a registry.
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'ism',
    dts: false,
    clean: false,
    treeshake: true,
    minify: true,
    sourcemap: false,
    target: 'es2022',
    outputOptions: { entryFileNames: 'ismjs.global.js' },
  },
])
