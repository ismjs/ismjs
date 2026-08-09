import { describe, expect, it } from 'vitest'
import manifest from '../package.json' with { type: 'json' }
import { SPEC_VERSION } from '../src/generated/spec-version.ts'
import { VERSION } from '../src/version.ts'

describe('VERSION', () => {
  // `src/version.ts` is written by hand so the vendorable bundle carries it.
  // Nothing but this test keeps it the same as the published version.
  it('matches package.json', () => {
    expect(VERSION).toBe(manifest.version)
  })

  // The two answer different questions: which build of this library, and which
  // edition of the specification it encodes. A vendored copy needs both.
  it('is distinct from the specification version', () => {
    expect(VERSION).not.toBe(SPEC_VERSION.spec)
  })
})
