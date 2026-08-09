/**
 * The individual segments of a rendered Marking.
 *
 * Each function returns its own leading `//`, or an empty string. The assembler
 * in `format.ts` is therefore a concatenation, not a series of conditionals.
 */
import { renderAtomicEnergy, renderCompartmented } from './compartment.ts'
import { spellEntity } from './entity-spelling.ts'
import { BANNER_SPELLING } from './generated/banner.ts'
import { FGI_MARKER } from './generated/ismcat.ts'
import { type Marking, isCuiDissem } from './marking.ts'
import {
  NON_US_ATOMIC_RENDER_ORDER,
  NON_US_SCI_RENDER_ORDER,
  orderNonIcForRendering,
} from './render-order.ts'

export { secondBannerLine } from './second-line.ts'
import {
  ACCM_PREFIX,
  BANNER_ORCON_USGOV,
  CUI as CUI_MARKER,
  CUI_SPECIFIED_PREFIX,
  DISPLAY_ONLY as DISPLAY_ONLY_PHRASE,
  EYES_ONLY,
  ITEM,
  JOINT,
  LIST,
  NON_US_QUALIFIER,
  REL_TO,
  SEGMENT,
  WORD,
} from './syntax.ts'
import { DISPLAY_ONLY, EYES, OC, OC_USGOV, REL, UNCLASSIFIED, USA } from './tokens.ts'

export const spell = (token: string, banner: boolean): string =>
  banner ? (BANNER_SPELLING[token] ?? token) : token

// ---------------------------------------------------------------------------
// Classification, with its ownership prefix
// ---------------------------------------------------------------------------

/**
 * A US-owned Marking starts with the bare classification. Any other Marking
 * starts with `//` and names its owners. A joint Marking names them after the
 * classification. Foreign ownership names them before it.
 */
export const classificationSegment = (marking: Marking, banner: boolean): string => {
  const owners = marking.ownerProducer
  const classification = spell(marking.classification, banner)
  const foreign = owners.filter((owner) => owner !== USA)

  if (owners.length > 1 && marking.FGIsourceProtected === undefined && marking.joint === true) {
    return `${SEGMENT}${JOINT}${WORD}${classification}${WORD}${owners.join(WORD)}`
  }

  if (owners.length > 1 && !owners.includes(USA) && marking.FGIsourceProtected === undefined) {
    return `${SEGMENT}${owners.join(WORD)}${WORD}${classification}`
  }

  if (owners.length === 1 && foreign.length === 1) {
    return `${SEGMENT}${spellEntity(foreign[0] ?? '')}${WORD}${classification}`
  }

  return classification
}

// ---------------------------------------------------------------------------
// Foreign government information
// ---------------------------------------------------------------------------

/**
 * FGI is only marked on a US-controlled document. A known open source names the
 * countries. A protected source renders the bare marker, which is what
 * `FGIsourceProtected` exists to do.
 *
 * The reference XSL also guards against an `UNKNOWN` source. No ISMCAT
 * vocabulary admits that token now, so the branch cannot be reached. It is left
 * out rather than written as a comparison that is always false.
 */
const isUsControlled = (marking: Marking): boolean => {
  const owners = marking.ownerProducer
  return (
    (owners.length === 1 && owners[0] === USA) ||
    (owners.includes(USA) && marking.FGIsourceProtected !== undefined)
  )
}

/**
 * Whether this Marking shows FGI at all.
 *
 * To carry an FGI source and to mark one are different facts, and the reference
 * keeps them apart. `CUIandICcontrolMarkings` tests the raw attributes. The
 * condition that decides whether `CUI` leads tests the rendered `$fgiVal`. A
 * Marking a foreign government owns can hold `FGIsourceOpen` and show nothing,
 * so `markingKind` and `leadsWithCui` must not share one test here.
 *
 * This function exists so that the second question is asked as a predicate,
 * instead of by rendering a segment and comparing it with the empty string.
 */
export const rendersFgi = (marking: Marking): boolean =>
  isUsControlled(marking) &&
  (marking.FGIsourceProtected !== undefined || marking.FGIsourceOpen !== undefined)

export const fgiSegment = (marking: Marking): string => {
  if (!rendersFgi(marking)) {
    return ''
  }
  if (marking.FGIsourceProtected !== undefined) {
    return `${SEGMENT}${FGI_MARKER}`
  }

  const open = marking.FGIsourceOpen ?? []
  return `${SEGMENT}${FGI_MARKER}${WORD}${open.map((entity) => spellEntity(entity)).join(WORD)}`
}

// ---------------------------------------------------------------------------
// Dissemination controls
// ---------------------------------------------------------------------------

const entities = (values: readonly string[] | undefined, delimiter: string): string =>
  (values ?? []).map((entity) => spellEntity(entity)).join(delimiter)

/**
 * `BannerMapping.xml` has no entry for `OC-USGOV`. The banner stylesheet adds it
 * with a string replace of its own, so the same exception is needed here.
 */
const dissemToken = (token: string, marking: Marking, banner: boolean): string => {
  switch (token) {
    case REL: {
      return REL_TO + entities(marking.releasableTo, LIST)
    }
    // An EYES ONLY list is slash-separated where a releasability list is comma-separated.
    case EYES: {
      return entities(marking.releasableTo, ITEM) + EYES_ONLY
    }
    case DISPLAY_ONLY: {
      return DISPLAY_ONLY_PHRASE + entities(marking.displayOnlyTo, LIST)
    }
    case OC_USGOV: {
      return banner ? BANNER_ORCON_USGOV : OC_USGOV
    }
    default: {
      return spell(token, banner)
    }
  }
}

/**
 * `OC-USGOV` consumes `OC`, as a control consumes its compartments. The
 * attribute set holds both, because ISM-ID-00302 requires both, and only the
 * more specific one renders. The reference does this as a string replace on the
 * sorted list, which makes it rendering and not normalisation.
 */
const consumed = (controls: readonly string[]): readonly string[] =>
  controls.includes(OC_USGOV) ? controls.filter((d) => d !== OC) : controls

export const dissemSegment = (marking: Marking, banner: boolean): string => {
  // A control that cannot render needs no filter here, because
  // `RenderableDissemControl` already excludes it. A consumed one does.
  const controls = consumed(marking.disseminationControls ?? [])
  if (controls.length === 0) {
    return ''
  }
  return SEGMENT + controls.map((d) => dissemToken(d, marking, banner)).join(ITEM)
}

// ---------------------------------------------------------------------------
// CUI
// ---------------------------------------------------------------------------

/**
 * `CUI` leads the string when there is nothing else to lead it.
 *
 * Every term reads a field, except the FGI term, which asks whether a segment is
 * shown. The reference tests `$fgiVal` here and the raw attributes in
 * `markingKind`, and that difference is real.
 *
 * Fields are read as `=== undefined` because a `Marking` is canonical and
 * `normalize.ts` has already dropped empty arrays. `markingKind` runs earlier,
 * on input, and cannot assume that.
 */
export const leadsWithCui = (marking: Marking): boolean =>
  hasCui(marking) &&
  marking.classification === UNCLASSIFIED &&
  marking.SCIcontrols === undefined &&
  marking.atomicEnergyMarkings === undefined &&
  !rendersFgi(marking) &&
  marking.nonICmarkings === undefined &&
  !hasNonCuiDissem(marking)

const hasCui = (marking: Marking): boolean =>
  marking.cuiBasic !== undefined || marking.cuiSpecified !== undefined

/**
 * `ism-func:get.dissemNotCUI`: a control the CUI register does not admit, and so
 * one that came from the classic register.
 *
 * Asked of the controls directly. It was once derived from `markingKind`, which
 * made this predicate partly an answer to a different question: a Marking is
 * Commingled for several reasons, and only one of them is a classic control.
 */
const hasNonCuiDissem = (marking: Marking): boolean =>
  (marking.disseminationControls ?? []).some((control) => !isCuiDissem(control))

/**
 * `//CUI` after the classification, when `CUI` did not lead.
 *
 * This is the exact complement of `leadsWithCui`. The reference's own pair is
 * not. Its `//CUI` condition leaves out the non-IC term that its leading
 * condition holds, so a Marking with CUI and a non-IC marking renders the CUI
 * categories with no `CUI` to introduce them.
 *
 * A legal Marking cannot reach that: ISM-ID-00486 forbids the combination, and
 * `validate` reports it. On an illegal one, a builder is better served by the
 * marker than by its absence. Not reproduced, and that is deliberate.
 */
export const cuiMarkerSegment = (marking: Marking): string =>
  hasCui(marking) && !leadsWithCui(marking) ? `${SEGMENT}${CUI_MARKER}` : ''

export const cuiCategoriesSegment = (marking: Marking): string => {
  const specified = marking.cuiSpecified
  const basic = marking.cuiBasic
  let out = ''

  if (specified !== undefined) {
    out += SEGMENT + specified.map((c) => `${CUI_SPECIFIED_PREFIX}${c}`).join(ITEM)
  }
  if (basic !== undefined) {
    out += (specified === undefined ? SEGMENT : ITEM) + basic.join(ITEM)
  }

  return out
}

// ---------------------------------------------------------------------------

// A non-US control has no segment of its own. Each one is appended to the
// segment it qualifies: `ATOMAL` to the atomic energy markings, `BOHEMIA` and
// `BALK` to the SCI controls.
//
// `nonICmarkings` does have its own segment, and it is always the last one. DoDM
// 5200.01-V2, Enclosure 4 §11 puts the "OTHER DISSEM" category after "all
// previously discussed markings". The vocabularies are not the same — the
// manual's category 9 is SPECAT, NC2-ESI, ACCM, XD and ND, and `CVEnumISMNonIC`
// adds the entries of the IC and State registers — but the position is.

/** Rendered without the `NATO-` qualifier the vocabulary carries. */
const bareNonUsControl = (control: string): string => control.replace(NON_US_QUALIFIER, '')

/**
 * Matched on the bare name, because documents write these both ways. The CVE
 * registers `NATO-ATOMAL`. The corpus and the reference XSL both accept the
 * unqualified form, in `contains($nonUSControls, 'ATOMAL')`.
 */
const nonUsSuffix = (marking: Marking, wanted: readonly string[]): string =>
  (marking.nonUSControls ?? [])
    .map((control) => bareNonUsControl(control))
    .filter((bare) => wanted.map((w) => bareNonUsControl(w)).includes(bare))
    .map((bare) => ITEM + bare)
    .join('')

export const sciSegment = (marking: Marking): string =>
  marking.SCIcontrols === undefined
    ? ''
    : SEGMENT +
      renderCompartmented(marking.SCIcontrols) +
      nonUsSuffix(marking, NON_US_SCI_RENDER_ORDER)

export const atomicSegment = (marking: Marking, banner: boolean): string =>
  marking.atomicEnergyMarkings === undefined
    ? ''
    : SEGMENT +
      renderAtomicEnergy(marking.atomicEnergyMarkings, banner) +
      nonUsSuffix(marking, NON_US_ATOMIC_RENDER_ORDER)

/**
 * Alternative Compensatory Control Measures are non-IC markings that share one
 * `ACCM-` qualifier. Only the first one carries it, and an underscore in the
 * programme name renders as a space: `ACCM-FICTITIOUS EFFORT/TEA LEAF`.
 *
 * That form is policy, not a reading of the XSL. DoDM 5200.01-V2, Enclosure 4
 * §11.a.(2) and Figure 54 give `SECRET//ACCM-FICTITIOUS EFFORT/TEA LEAF`
 * verbatim: a hyphen with no spaces between the caveat and the first nickname,
 * and a forward slash between nicknames.
 */

/**
 * In Presentation Order, ACCM entries go in after `DS`. They are not sorted
 * with the rest.
 * `ism-func:sortNonIC` places them after everything that ranks at or before
 * `DS`, which is the first entry in the vocabulary.
 */
export const nonIcSegment = (marking: Marking, banner: boolean): string => {
  const markings = marking.nonICmarkings
  if (markings === undefined) {
    return ''
  }

  const ordered = orderNonIcForRendering(markings)
  const firstAccm = ordered.find((m) => m.startsWith(ACCM_PREFIX))
  const rendered = ordered.map((m) =>
    m.startsWith(ACCM_PREFIX)
      ? (m === firstAccm ? ACCM_PREFIX : '') + spellEntity(m.slice(ACCM_PREFIX.length))
      : spell(m, banner),
  )

  return SEGMENT + rendered.join(ITEM)
}
