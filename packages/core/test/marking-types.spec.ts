import { describe, expect, it } from 'vitest'
import type { OwnerProducer } from '../src/generated/ismcat.ts'
import { createMarking } from '../src/index.ts'
import { type Marking } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'

/**
 * Type-level guarantees, asserted instead of described.
 *
 * These bodies do almost nothing at runtime. Their value is that they
 * typecheck. An unused `@ts-expect-error` is itself a compile error, so the
 * build fails here if the brand or the non-empty guarantee stops holding.
 */

describe('the Canonical brand', () => {
  // The brand lets `format` trust its input without checking it. If these stop
  // being type errors, that guarantee is gone. An unused @ts-expect-error fails
  // the build, so this cannot decay in silence.
  it('refuses a hand-rolled array where Canonical Order is required', () => {
    const marking: Marking = {
      classification: 'S',
      // @ts-expect-error a plain array is not Canonical; canonicalize must mint it
      ownerProducer: ['USA'],
    }
    expect(marking.classification).toBe('S')
  })

  it('refuses an array that happens to be in the right order', () => {
    const marking: Marking = {
      classification: 'S',
      ownerProducer: canonicalize({ classification: 'S', ownerProducer: ['USA'] }).ownerProducer,
      // @ts-expect-error correct order is not enough — the brand is the proof
      disseminationControls: ['NF', 'DSEN'],
    }
    expect(marking.ownerProducer).toEqual(['USA'])
  })
})

describe('pattern terms the registers admit', () => {
  // A cast in `checkDraft` used to hide these: it let a Marking hold values its
  // own type did not admit. Unskipped corpus vectors exercise each one, so the
  // type must allow it.
  it('admits an ACCM programme as a non-IC marking', () => {
    const marking = canonicalize({
      classification: 'S',
      ownerProducer: ['USA'],
      nonICmarkings: ['DS', 'ACCM-TEA_LEAF'],
    })
    expect(marking.nonICmarkings).toContain('ACCM-TEA_LEAF')
  })

  it('admits a NATO sub-organisation wherever the register has the pattern', () => {
    const marking = canonicalize({
      classification: 'S',
      ownerProducer: ['USA'],
      releasableTo: ['USA', 'NATO:ABC'],
      displayOnlyTo: ['NATO:ISAF'],
      FGIsourceOpen: ['NATO:ISAF'],
      FGIsourceProtected: ['NATO:ISAF'],
    })
    expect(marking.releasableTo).toContain('NATO:ABC')
  })

  // NATO ownership is deferred in docs/roadmap.md, and the corpus agrees: every
  // vector naming an organisation as owner is skipped. The type says so too,
  // which is why this has to stay an error.
  it('refuses a NATO sub-organisation as an owner-producer', () => {
    const marking = canonicalize({
      classification: 'S',
      // @ts-expect-error NATO ownership is deferred; see docs/roadmap.md
      ownerProducer: ['NATO:ISAF'],
    })
    expect(marking.classification).toBe('S')
  })
})

describe('non-empty owner-producers', () => {
  // Rejected twice over: the type forbids it, and the runtime check catches a
  // caller who reached the function from JavaScript or through `any`.
  it('refuses a Marking with no owner-producer', () => {
    expect(() =>
      canonicalize({
        classification: 'S',
        // @ts-expect-error ISM requires at least one owner-producer
        ownerProducer: [],
      }),
    ).toThrow(TypeError)
  })

  it('lets a canonicalised Marking be canonicalised again', () => {
    const once = canonicalize({ classification: 'S', ownerProducer: ['USA'] })
    // Not just a runtime property — `Marking` has to remain valid `MarkingInput`.
    expect(canonicalize(once)).toEqual(once)
  })

  it('knows an owner-producer list is never empty', () => {
    const marking = canonicalize({ classification: 'S', ownerProducer: ['USA'] })
    // Typed as OwnerProducer, not OwnerProducer | undefined, despite
    // noUncheckedIndexedAccess — that is what CanonicalNonEmpty buys.
    const first: OwnerProducer = marking.ownerProducer[0]
    expect(first).toBe('USA')
  })

  it('accepts what canonicalize produces', () => {
    const marking: Marking = canonicalize({
      classification: 'S',
      ownerProducer: ['USA'],
      disseminationControls: ['DSEN', 'NF'],
    })
    expect(marking.disseminationControls).toEqual(['NF', 'DSEN'])
  })
})

describe('dependent second Banner Line values', () => {
  it('refuses to create an HVCO Marking without meaningful channels', () => {
    expect(() =>
      createMarking({
        classification: 'S',
        ownerProducer: ['USA'],
        secondBannerLine: ['HVCO'],
      }),
    ).toThrow(TypeError)
  })

  it('refuses to create orphaned or delimiter-bearing channels', () => {
    expect(() =>
      createMarking({
        classification: 'S',
        ownerProducer: ['USA'],
        handleViaChannels: 'ALPHA',
      }),
    ).toThrow(TypeError)
    expect(() =>
      createMarking({
        classification: 'S',
        ownerProducer: ['USA'],
        secondBannerLine: ['HVCO'],
        handleViaChannels: 'ALPHA/BRAVO',
      }),
    ).toThrow(TypeError)
  })

  it('refuses channel text that parsing would trim', () => {
    expect(() =>
      createMarking({
        classification: 'S',
        ownerProducer: ['USA'],
        secondBannerLine: ['HVCO'],
        handleViaChannels: ' ALPHA ',
      }),
    ).toThrow(TypeError)
  })
})
