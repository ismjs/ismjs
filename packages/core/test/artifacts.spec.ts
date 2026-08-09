import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

/**
 * The published artifacts, loaded the way a consumer loads them.
 *
 * Every other suite imports `src/`, which says nothing about what npm ships. A
 * broken `exports` map, a missing file, or a bundle that throws on load are all
 * invisible to those suites. This is the only place the three artifacts are
 * loaded the three ways they are meant to be loaded.
 *
 * `bun run build` must run first. On a local machine these tests are skipped
 * when it has not, so `bun run test` on a new checkout is not all red. In CI
 * they are never skipped. A silent skip would make the one suite that tests the
 * published package test nothing.
 */
const DIST = join(import.meta.dirname, '..', 'dist')
const built = existsSync(join(DIST, 'index.mjs'))
const inCi = process.env['CI'] !== undefined

/** One marking exercising ownership, a compartment, FGI and dissemination. */
const BANNER = 'TOP SECRET//SI-G ABCD//FGI DEU//ORCON-USGOV/NOFORN'
const PORTION = '(TS//SI-G ABCD//FGI DEU//OC-USGOV/NF) '

type Codec = {
  parse: (input: string) => { ok: boolean; marking?: unknown }
  format: (marking: unknown, mode: string) => string
  validate: (marking: unknown) => readonly unknown[]
  createMarking: (input: unknown) => unknown
  RenderMode: { Portion: string; Banner: string }
  SPEC_VERSION: { spec: string }
  VERSION: string
  tokens: Record<string, string>
}

/** The round trip, run against whichever artifact was handed in. */
const exercise = (ism: Codec): void => {
  const result = ism.parse(BANNER)
  expect(result.ok).toBe(true)
  expect(ism.format(result.marking, ism.RenderMode.Portion)).toBe(PORTION)
  expect(ism.format(result.marking, ism.RenderMode.Banner)).toBe(BANNER)
  expect(ism.validate(result.marking)).toEqual([])

  // The main actions take plain fields, not only a canonical Marking. Check that
  // against the built artifact, not only against `src/`.
  expect(ism.format({ classification: 'S', ownerProducer: ['USA'] }, ism.RenderMode.Portion)).toBe(
    '(S) ',
  )
  expect(ism.validate({ classification: 'S', ownerProducer: ['USA'] })).toEqual([])
  expect(ism.createMarking({ classification: 'S', ownerProducer: ['USA'] })).toEqual({
    classification: 'S',
    ownerProducer: ['USA'],
  })

  // The named exports a consumer builds a Marking from, not just the functions.
  expect(ism.tokens['USA']).toBe('USA')
  expect(ism.SPEC_VERSION.spec).toMatch(/^\d+\.\d+$/u)
  // `VERSION` exists for this: a copy vendored onto an air-gapped network
  // arrives with no manifest, so the file must name itself.
  expect(ism.VERSION).toMatch(/^\d+\.\d+\.\d+/u)
}

describe.skipIf(!built && !inCi)('the published artifacts', () => {
  it('was built before being tested', () => {
    expect(built, 'run `bun run build` first').toBe(true)
  })

  it('loads as ESM', async () => {
    const ism = await import(pathToFileURL(join(DIST, 'index.mjs')).href)
    exercise(ism as Codec)
  })

  it('loads as CommonJS', () => {
    const require = createRequire(import.meta.url)
    exercise(require(join(DIST, 'index.cjs')) as Codec)
  })

  /**
   * The vendorable artifact, loaded the way an air-gapped consumer loads it: as
   * a script tag with no module system. It runs in a bare VM context, so a
   * reference to `require`, `module` or `process` fails here and not on a
   * disconnected network.
   */
  it('loads as a bare script, with no module system', () => {
    const source = readFileSync(join(DIST, 'ismjs.global.js'), 'utf8')
    const sandbox: { ism?: Codec } = {}
    runInNewContext(source, sandbox)

    expect(sandbox.ism).toBeDefined()
    exercise(sandbox.ism as Codec)
  })

  // The label subpath is a separate entry point. It keeps 63 kB of display text
  // out of the codec, and out of the vendorable bundle.
  it('serves labels from the descriptions subpath', async () => {
    const labels = await import(pathToFileURL(join(DIST, 'descriptions.mjs')).href)
    expect(labels['TRIGRAPH_DESCRIPTIONS']['USA']).toBe('United States of America')
    expect(Object.keys(labels['CUI_DESCRIPTIONS'])).toHaveLength(123)
  })

  it('keeps display text out of the vendorable bundle', () => {
    const bundle = readFileSync(join(DIST, 'ismjs.global.js'), 'utf8')
    // Country names, CUI prose and compartment cover names are display-only.
    for (const text of ['Afghanistan', 'Zimbabwe', 'TALENT KEYHOLE', 'Administrative']) {
      expect(bundle, text).not.toContain(text)
    }
    // What must remain: the banner spellings rendering depends on.
    expect(bundle).toContain('TOP SECRET')
  })

  it('ships nothing the exports map does not reach', () => {
    // `index.mjs` imports `runtime.mjs` by a relative path, which does not go
    // through `exports`. The file must still be in the package.
    const files = [
      'index.mjs',
      'index.cjs',
      'index.d.mts',
      'index.d.cts',
      'descriptions.mjs',
      'descriptions.cjs',
      'descriptions.d.mts',
      'descriptions.d.cts',
      'runtime.mjs',
    ]
    for (const file of files) {
      expect(existsSync(join(DIST, file)), file).toBe(true)
    }
  })
})
