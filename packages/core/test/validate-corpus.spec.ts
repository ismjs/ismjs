import { describe, expect, it } from 'vitest'
import type { Vector } from '../scripts/corpus.ts'
import { IssueCode, Severity } from '../src/issue.ts'
import type { Issue } from '../src/issue.ts'
import { validate } from '../src/validate.ts'
import vectors from './fixtures/vectors.json' with { type: 'json' }
import { toMarking } from './vector.ts'

/**
 * What the corpus says when the rules are applied to it.
 *
 * The XSpec vectors exercise the rendering stylesheets, not the rule corpus, and
 * several hold every construct at once. Violations here are expected, and they
 * show that the rules bite. Each one is listed rather than counted, so a new
 * violation cannot appear unseen.
 */
describe('the corpus', () => {
  const active = (vectors as readonly Vector[]).filter((v) => v.skip === undefined)

  it('breaks exactly the rules we expect it to', () => {
    const found = new Map<string, Set<string>>()
    for (const vector of active) {
      const marking = toMarking(vector)
      if (marking === undefined) {
        continue
      }
      for (const issue of validate(marking, { createdOn: '2024-01-01' })) {
        const seen = found.get(issue.ruleId ?? '') ?? new Set<string>()
        seen.add(vector.label)
        found.set(issue.ruleId ?? '', seen)
      }
    }

    const summary = Object.fromEntries(
      [...found].map(([id, labels]) => [id, labels.size]).toSorted(),
    )

    // A rendering vector is minimal by design. `(TS//RD)` is the smallest input
    // that exercises atomic energy rendering, and adding the NOFORN that the
    // rule requires would test two things at once. These are real violations of
    // real rules, by markings that were never meant to be valid.
    expect(summary).toEqual({
      // HCS requires NOFORN, and requires a sub-compartment.
      'ISM-ID-00049': 2,
      'ISM-ID-00474': 2,
      // `NF` beside `RELIDO`.
      'ISM-ID-00169': 1,
      // `RSMA` was retired 2021-11-03, after these vectors were written.
      'ISM-ID-00199': 4,
      // Three `*USA-NAC` vectors release to `GBR NATO:PfP`, which names no USA.
      // A releasability list starts with the USA. The order-test vectors that
      // write `AUS NATO USA` are not here: canonicalisation puts the USA first,
      // which is what those vectors exist to exercise.
      'ISM-ID-00214': 3,
      // `RD` beside `FRD`.
      'ISM-ID-00321': 5,
      // DS (LIMDIS) requires UNCLASSIFIED.
      'ISM-ID-00346': 3,
      // RSV requires NOFORN.
      'ISM-ID-00464': 1,
      // Restricted Data requires NOFORN.
      'ISM-ID-00467': 10,
      // The two `Commingled-*-All-Types` vectors carry `nonICmarkings="DS"`
      // beside CUI, which ISM.XML forbids. They exist to show that the
      // stylesheets render that combination. The corpus is a rendering suite,
      // and rendering something is not a claim that it is legal.
      'ISM-ID-00486': 2,
    })
  })

  it('finds nothing in the corpus once the deprecation date is respected', () => {
    // Every vector is older than the 2021-11-03 retirement. With a resource date
    // from that time, the RSMA errors become warnings.
    const errors: Issue[] = []
    for (const vector of active) {
      const marking = toMarking(vector)
      if (marking === undefined) {
        continue
      }
      for (const issue of validate(marking, { createdOn: '2021-01-01' })) {
        if (issue.code === IssueCode.Deprecated && issue.severity === Severity.Error) {
          errors.push(issue)
        }
      }
    }

    expect(errors).toEqual([])
  })
})
