import type { Vector } from '../scripts/corpus.ts'
import type { Draft } from '../src/draft.ts'
import type { Issue } from '../src/issue.ts'
import type { Marking } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'
import { checkDraft } from '../src/check.ts'

/** ISM attributes are whitespace-separated token lists. */
const tokens = (value: string | undefined): readonly string[] =>
  (value ?? '').split(/\s+/u).filter(Boolean)

/**
 * Vectors whose attributes no valid Marking can hold, and the reason for each.
 *
 * Listed, not skipped in silence, and asserted in both directions below. An
 * unlisted vector that fails to check is a defect. A listed one that starts to
 * check means the entry is out of date.
 */
export const UNREPRESENTABLE: Readonly<Record<string, string>> = {
  // Exercises underscore rendering with a fictitious tetragraph. Rejecting it is
  // correct: no register holds it, so no real document can carry it. The vector
  // therefore tests neither `format` nor the round-trip law, because there is no
  // Marking to start from.
  'REL-FAKE_TETRA-UNDERSCORE': 'releases to a tetragraph no register contains',
}

/**
 * A harvested vector's attributes, as a Marking. Returns `undefined` for the
 * few vectors listed above, which cannot become one.
 *
 * The vectors are JSON, so every attribute is text. `parse` has the same
 * problem, and this solves it the same way instead of asserting the shape. A
 * vector that the vocabularies reject throws here unless it is listed above. The
 * corpus comes from ODNI's own suites, so that would be a fault in the
 * harvester, and it must be loud.
 *
 * Attributes outside the projection are not read: the authority block, the CUI
 * control block, and the DES versions. See
 * docs/adr/0001-marking-is-the-string-expressible-projection.md.
 */
export const toMarking = (vector: Vector): Marking | undefined => {
  const a = vector.attributes
  const draft: Draft = {
    // An absent classification stays absent, so `checkDraft` reports it. Do not
    // substitute a value that would parse.
    ...(a['classification'] !== undefined && { classification: a['classification'] }),
    ownerProducer: tokens(a['ownerProducer']),
    ...(a['joint'] === 'true' && { joint: true }),
    SCIcontrols: tokens(a['SCIcontrols']),
    atomicEnergyMarkings: tokens(a['atomicEnergyMarkings']),
    disseminationControls: tokens(a['disseminationControls']),
    releasableTo: tokens(a['releasableTo']),
    displayOnlyTo: tokens(a['displayOnlyTo']),
    FGIsourceOpen: tokens(a['FGIsourceOpen']),
    FGIsourceProtected: tokens(a['FGIsourceProtected']),
    nonICmarkings: tokens(a['nonICmarkings']),
    nonUSControls: tokens(a['nonUSControls']),
    cuiBasic: tokens(a['cuiBasic']),
    cuiSpecified: tokens(a['cuiSpecified']),
    secondBannerLine: tokens(a['secondBannerLine']),
    ...(a['handleViaChannels'] !== undefined && { handleViaChannels: a['handleViaChannels'] }),
  }

  const issues: Issue[] = []
  const checked = checkDraft(draft, issues)
  const expected = UNREPRESENTABLE[vector.label]

  if (checked === undefined) {
    if (expected === undefined) {
      throw new TypeError(`${vector.label}: ${issues.map((i) => i.message).join('; ')}`)
    }
    return undefined
  }
  if (expected !== undefined) {
    throw new TypeError(`${vector.label} now checks; remove it from UNREPRESENTABLE (${expected})`)
  }
  return canonicalize(checked)
}
