import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { RenderMode, format } from '../src/format.ts'
import { MarkingKind, markingKind } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'
import { parse } from '../src/parse.ts'
import { leadsWithCui } from '../src/segments.ts'
import { CUI } from '../src/syntax.ts'
import { HVCO } from '../src/tokens.ts'
import { anyMarking } from './arbitrary.ts'
import { lossy } from './lossy.ts'

/**
 * The round-trip law over Markings nobody wrote down.
 *
 * `roundtrip.spec.ts` checks the 139 markings that ODNI's XSpec suites assert.
 * This checks the combinations they do not reach: a joint marking that also
 * carries CUI, an ACCM programme beside a registered non-IC marking, a SIGMA run
 * under a non-US control. The same law, and the same `lossy` exceptions.
 */
describe('parse(format(m)) === m over generated Markings', () => {
  for (const mode of [RenderMode.Portion, RenderMode.Banner] as const) {
    it(`holds for every ${mode} rendering`, () => {
      fc.assert(
        fc.property(anyMarking, (input) => {
          const marking = canonicalize(input)
          const rendered = format(marking, mode)
          const loss = lossy(marking, mode)
          const result = parse(rendered)

          if (loss !== undefined) {
            // Asserted as a loss, not skipped. If one begins to round-trip,
            // remove the entry from `lossy`.
            const recovered =
              result.ok && JSON.stringify(result.marking) === JSON.stringify(marking)
            expect(recovered, `${rendered} was expected to lose: ${loss}`).toBe(false)
            return
          }

          const detail = result.ok
            ? ''
            : `${rendered}\n  ${result.issues.map((i) => i.message).join('; ')}`
          expect(result.ok, detail).toBe(true)
          if (result.ok) {
            expect(result.marking, `\n  ${rendered}`).toEqual(marking)
          }
        }),
        { numRuns: 5000 },
      )
    })
  }

  it('holds for every accepted HVCO Banner Line', () => {
    fc.assert(
      fc.property(
        anyMarking.filter((input) => input.secondBannerLine?.includes(HVCO) ?? false),
        (input) => {
          const marking = canonicalize(input)
          const rendered = format(marking, RenderMode.Banner)
          const result = parse(rendered)

          expect(result.ok, rendered).toBe(true)
          if (result.ok) {
            expect(result.marking).toEqual(marking)
          }
        },
      ),
      { numRuns: 1000 },
    )
  })
})

/**
 * Marking Kind against the segment that leads the string.
 *
 * Two predicates used to answer these questions, they disagreed, and nothing
 * compared them. The questions are next to each other — which vocabulary
 * governs, and what leads the rendering — so the relation between them is held
 * still here.
 */
describe('Marking Kind and the leading segment', () => {
  it('leads with CUI exactly when `leadsWithCui` says so', () => {
    fc.assert(
      fc.property(anyMarking, (input) => {
        const marking = canonicalize(input)
        expect(format(marking, RenderMode.Banner).startsWith(CUI)).toBe(leadsWithCui(marking))
        expect(format(marking, RenderMode.Portion).startsWith(`(${CUI}`)).toBe(
          leadsWithCui(marking),
        )
      }),
      { numRuns: 5000 },
    )
  })

  /**
   * One direction only. The converse is false, and that is correct.
   *
   * A pure CUI Marking holds no FGI attribute, so nothing can make it render an
   * FGI segment, and every other term the two predicates share is the same field
   * test. The converse fails when the attributes carry FGI that the string does
   * not show, which is a Marking a foreign government owns. That is the
   * difference between a raw attribute and a rendered segment. The reference
   * draws it, and this library keeps it.
   */
  it('always leads with CUI when the kind is pure CUI', () => {
    let pure = 0
    fc.assert(
      fc.property(anyMarking, (input) => {
        const marking = canonicalize(input)
        if (markingKind(marking) !== MarkingKind.Cui) {
          return
        }
        pure += 1
        expect(leadsWithCui(marking)).toBe(true)
      }),
      { numRuns: 5000 },
    )
    // The implication is vacuous if nothing generated satisfies it.
    expect(pure).toBeGreaterThan(0)
  })
})

/**
 * Rendering is total over Markings. Every Marking makes a string, and the string
 * is well-formed even where `parse` cannot read it back. This is checked on its
 * own, so a crash in `format` is not reported as a parse failure.
 */
describe('format is total', () => {
  it('renders every Marking without throwing', () => {
    fc.assert(
      fc.property(anyMarking, fc.constantFrom(RenderMode.Portion, RenderMode.Banner), (m, mode) => {
        const rendered = format(canonicalize(m), mode)
        expect(rendered.length).toBeGreaterThan(0)
        expect(rendered).not.toContain('///')
      }),
      { numRuns: 5000 },
    )
  })
})
