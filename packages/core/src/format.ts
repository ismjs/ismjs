/**
 * Rendering a Marking as a Banner Line or a Portion Mark.
 *
 *   classification // SCI // atomic energy // FGI // CUI // dissemination // non-IC
 *
 * Segment order is policy, not an implementation detail. DoDM 5200.01-V2,
 * Enclosure 4 §1.b gives the syntax as
 * `CLASSIFICATION//SCI//SAP//AEA//FGI//DISSEM//OTHER DISSEM`. §11 puts the
 * "OTHER DISSEM" category, which is this library's `nonICmarkings`, after
 * everything else. SAP is out of scope for v1. The rest is that order exactly.
 *
 * The one segment the manual cannot place is CUI. Figure 25 has no CUI category
 * at all, and §10.b defers to a Volume 4 that was never published. The slot used
 * here, between FGI and the dissemination controls, comes from
 * `IC-ISM-PortionMark.xsl` and `IC-ISM-SecurityBanner.xsl`, which implement the
 * same order and additionally decide that one.
 *
 * A Portion Mark is that assembly in parentheses, with a trailing space and
 * abbreviated tokens. A Banner Line spells the tokens out and puts any second
 * banner line after a `|`. The segments are in `segments.ts`.
 */
import type { MarkingInput } from './marking.ts'
import { createMarking } from './normalize.ts'
import { CUI, PORTION_CLOSE, PORTION_OPEN } from './syntax.ts'
import {
  atomicSegment,
  classificationSegment,
  cuiCategoriesSegment,
  cuiMarkerSegment,
  dissemSegment,
  fgiSegment,
  leadsWithCui,
  nonIcSegment,
  sciSegment,
  secondBannerLine,
} from './segments.ts'

export const RenderMode = {
  Banner: 'banner',
  Portion: 'portion',
} as const

export type RenderMode = (typeof RenderMode)[keyof typeof RenderMode]

/**
 * Render a Marking.
 *
 * Takes a plain object as readily as a `Marking`, and canonicalises it on the
 * way in: deduplicates each field and orders it by the governing vocabulary. A
 * caller who wants the canonical object calls `createMarking`. A caller who
 * wants only a string does not have to.
 *
 * Everything below can therefore assume its fields are in Canonical Order,
 * which is what the `Canonical<T>` brand guarantees. A segment may project a
 * field into documented Presentation Order without mutating the Marking.
 */
export const format = (input: MarkingInput, mode: RenderMode): string => {
  const marking = createMarking(input)
  const banner = mode === RenderMode.Banner

  const body =
    (leadsWithCui(marking) ? CUI : classificationSegment(marking, banner)) +
    sciSegment(marking) +
    atomicSegment(marking, banner) +
    fgiSegment(marking) +
    cuiMarkerSegment(marking) +
    cuiCategoriesSegment(marking) +
    dissemSegment(marking, banner) +
    nonIcSegment(marking, banner)

  return banner ? body + secondBannerLine(marking) : PORTION_OPEN + body + PORTION_CLOSE
}
