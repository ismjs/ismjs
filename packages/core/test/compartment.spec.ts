import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { canonicalTokens } from '../src/canonical.ts'
import { renderAtomicEnergy, renderCompartmented } from '../src/compartment.ts'
import { expandAtomicEnergy, expandCompartmented } from '../src/expand.ts'
import { ATOMIC_ENERGY_MARKING_TOKENS, SCI_CONTROL_TOKENS } from '../src/generated/vocab.ts'
import { unbannerAtomic } from '../src/spelling.ts'
import { COMPARTMENT } from '../src/syntax.ts'

/**
 * The Compartment codec on its own, without a marking string around it.
 *
 * `compartment.ts` writes a run of controls and their Compartments.
 * `expand.ts` reads one back. The two encode the same rule in opposite
 * directions: the depth of a token is its hyphen count, and only the last
 * hyphen-separated part is emitted.
 *
 * The round trip is already exercised by the corpus and by the generated-Marking
 * property, so this adds no coverage. It adds diagnosis. A fault in the depth
 * rule currently appears as a round-trip failure carrying a whole marking
 * string; here it appears as the run that broke.
 *
 * The examples below are the ones the two modules state in their own comments.
 * Nothing asserted them.
 */

/** Every ancestor of a token, which a rendered run needs to rebuild the rest. */
const withAncestors = (token: string, vocabulary: readonly string[]): readonly string[] => {
  const parts = token.split(COMPARTMENT)
  return parts
    .map((_, index) => parts.slice(0, index + 1).join(COMPARTMENT))
    .filter((step) => step === token || vocabulary.includes(step))
}

/** A run in Canonical Order, which is what `renderCompartmented` assumes. */
const runOf = (vocabulary: readonly string[], max: number): fc.Arbitrary<readonly string[]> =>
  fc
    .uniqueArray(fc.constantFrom(...vocabulary), { minLength: 1, maxLength: max })
    .map((tokens) => Array.from(new Set(tokens.flatMap((t) => withAncestors(t, vocabulary)))))
    .map((tokens) => canonicalTokens(tokens, vocabulary))

/**
 * SCI runs need free compartments to reach depth 2.
 *
 * No registered SCI control has two hyphens — the register stops at `SI-G` —
 * so a run drawn from the vocabulary alone never exercises the depth-2
 * separator at all. Compartments are programme names, which is exactly why they
 * are not in any register, and they are where depth 2 comes from.
 */
const sciRun: fc.Arbitrary<readonly string[]> = fc
  .array(
    fc.tuple(
      fc.constantFrom(...SCI_CONTROL_TOKENS),
      fc.uniqueArray(fc.stringMatching(/^[A-Z]{3,5}$/u), { maxLength: 2 }),
    ),
    { minLength: 1, maxLength: 3 },
  )
  .map((pairs) =>
    pairs.flatMap(([control, compartments]) =>
      compartments.length === 0
        ? withAncestors(control, SCI_CONTROL_TOKENS)
        : compartments.flatMap((c) =>
            withAncestors(`${control}${COMPARTMENT}${c}`, SCI_CONTROL_TOKENS),
          ),
    ),
  )
  .map((tokens) => canonicalTokens(Array.from(new Set(tokens)), SCI_CONTROL_TOKENS))

describe('SCI controls', () => {
  it('renders a run the way compartment.ts documents', () => {
    expect(renderCompartmented(['SI', 'SI-G', 'SI-G-ABCD', 'SI-G-ACDE', 'TK'])).toBe(
      'SI-G ABCD ACDE/TK',
    )
  })

  it('reads that run back', () => {
    expect(expandCompartmented('SI-G ABCD ACDE/TK')).toEqual([
      'SI',
      'SI-G',
      'SI-G-ABCD',
      'SI-G-ACDE',
      'TK',
    ])
  })

  // Compartments at the same depth are siblings, not a chain.
  it('treats same-depth compartments as siblings', () => {
    expect(expandCompartmented('RSV-ABC-DEF')).toEqual(['RSV', 'RSV-ABC', 'RSV-DEF'])
  })

  // A run can return to depth 1 after a part at depth 2, which is why the
  // separator has to be carried rather than the parts re-split afterwards.
  it('returns to depth 1 after a depth-2 part', () => {
    expect(expandCompartmented('SI-EU AAA-NK AAA')).toEqual([
      'SI',
      'SI-EU',
      'SI-EU-AAA',
      'SI-NK',
      'SI-NK-AAA',
    ])
  })

  it('round-trips any run, including compartments at depth 2', () => {
    let deep = 0
    fc.assert(
      fc.property(sciRun, (tokens) => {
        if (tokens.some((t) => t.split(COMPARTMENT).length - 1 >= 2)) {
          deep += 1
        }
        expect(expandCompartmented(renderCompartmented(tokens))).toEqual([...tokens])
      }),
      { numRuns: 2000 },
    )
    // The depth-2 separator is the whole reason this property exists. Without
    // this the generator could stop producing compartments and say nothing.
    expect(deep).toBeGreaterThan(0)
  })
})

describe('atomic energy markings', () => {
  // A SIGMA value looks like a subcompartment and is not. A run of them shares
  // one `SG` qualifier and hangs off the control that opened the run.
  it('renders a SIGMA run the way compartment.ts documents', () => {
    expect(renderAtomicEnergy(['RD', 'RD-CNWDI', 'RD-SG-14'], false)).toBe('RD-CNWDI-SG 14')
    expect(renderAtomicEnergy(['FRD', 'FRD-SG-14', 'FRD-SG-20'], false)).toBe('FRD-SG 14 20')
  })

  it('reads a SIGMA run back', () => {
    expect(expandAtomicEnergy('RD-CNWDI-SG 14 20/FRD-SG 14 20')).toEqual([
      'RD',
      'RD-CNWDI',
      'RD-SG-14',
      'RD-SG-20',
      'FRD',
      'FRD-SG-14',
      'FRD-SG-20',
    ])
  })

  it('round-trips any run of registered markings', () => {
    fc.assert(
      fc.property(runOf(ATOMIC_ENERGY_MARKING_TOKENS, 4), (tokens) => {
        expect(expandAtomicEnergy(renderAtomicEnergy(tokens, false))).toEqual([...tokens])
      }),
      { numRuns: 2000 },
    )
  })

  /**
   * The read path takes no mode, so it cannot mirror `renderAtomicEnergy`.
   *
   * `format` is a function of a Marking and a mode. `parse` is a function of the
   * string alone: it strips a Portion Mark wrapper if there is one and then
   * reads segments without knowing which form it read. So the banner spellings
   * are undone by `unbannerAtomic` before expansion, unconditionally, and that
   * is safe only while every substitution is a no-op on portion text.
   *
   * This pins both halves. It is the reason the two modules are not symmetric,
   * and the reason they should not be made so.
   */
  it('reads a banner spelling back through the same expander', () => {
    const tokens = ['RD', 'RD-CNWDI', 'RD-SG-14']
    const banner = renderAtomicEnergy(tokens, true)

    expect(banner).toBe('RD-CNWDI-SIGMA 14')
    expect(expandAtomicEnergy(unbannerAtomic(banner))).toEqual(tokens)
  })

  it('leaves a portion mark unchanged when the banner spellings are undone', () => {
    fc.assert(
      fc.property(runOf(ATOMIC_ENERGY_MARKING_TOKENS, 4), (tokens) => {
        const portion = renderAtomicEnergy(tokens, false)
        expect(unbannerAtomic(portion)).toBe(portion)
      }),
      { numRuns: 2000 },
    )
  })
})
