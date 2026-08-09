/**
 * Putting a Marking into Canonical Order.
 *
 * Everything here is normalisation: deduplicating, ordering by the governing
 * vocabulary, and projecting away what no marking string can express. The types
 * it produces live in `marking.ts`.
 */
import { admitsNonUs } from './admit.ts'
import {
  type Canonical,
  canonicalNonEmpty,
  canonicalRearrangement,
  canonicalTokens,
} from './canonical.ts'
import { CUI_BASIC_TOKENS, CUI_SPECIFIED_TOKENS } from './generated/cui.ts'
import {
  FGI_OPEN_ENTITY_TOKENS,
  FGI_PROTECTED_ENTITY_TOKENS,
  OWNER_PRODUCER_TOKENS,
  REL_TO_ENTITY_TOKENS,
} from './generated/ismcat.ts'
import {
  ATOMIC_ENERGY_MARKING_TOKENS,
  NON_IC_MARKING_TOKENS,
  NON_US_CONTROL_TOKENS,
  SCI_CONTROL_TOKENS,
  SECOND_BANNER_LINE_TOKENS,
} from './generated/vocab.ts'
import type { DissemControl, NonUsControl } from './generated/vocab.ts'
import {
  type Marking,
  type MarkingInput,
  type RelToExpression,
  type RenderableDissemControl,
  dissemOrder,
  markingKind,
} from './marking.ts'
import { hvcoChannelProblem } from './hvco.ts'
import { EXEMPT_FROM_DISCOVERY, NATO, NATO_PREFIX } from './tokens.ts'

/** Drops the one dissemination control no marking string can express. */
const renderableDissem = (values: readonly DissemControl[]): readonly RenderableDissemControl[] =>
  values.filter((d): d is RenderableDissemControl => d !== EXEMPT_FROM_DISCOVERY)

/**
 * NATO sub-organisations sort alphabetically in NATO's place, and displace the
 * bare `NATO` entry while doing so.
 *
 * `ism-func:sortCountryAndTetra` puts them between the values that rank strictly
 * before `NATO` and those that rank strictly after it. Anything ranking exactly
 * at `NATO`, which is only `NATO` itself, falls out of both halves and is lost.
 * Reproduced on purpose: `REL TO … FVEY, NATO ABC, NATO DEF, RSMA` has no bare
 * `NATO`, even though the attribute supplied one.
 */
const spliceNatoSubOrganisations = <T extends string>(
  values: readonly T[],
  vocabulary: readonly string[],
): readonly T[] => {
  const subOrganisations = values.filter((value) => value.startsWith(NATO_PREFIX)).toSorted()
  if (subOrganisations.length === 0) {
    return values
  }

  const rank = (value: string): number => {
    const index = vocabulary.indexOf(value)
    return index === -1 ? vocabulary.length : index
  }
  const natoRank = rank(NATO)
  const rest = values.filter((value) => !value.startsWith(NATO_PREFIX))

  return [
    ...rest.filter((v) => rank(v) < natoRank),
    ...subOrganisations,
    ...rest.filter((v) => rank(v) > natoRank),
  ]
}

/** Releasability lists order like any other field, then splice in sub-organisations. */
const releasability = (
  values: readonly RelToExpression[] | undefined,
): Canonical<RelToExpression> | undefined => {
  const ordered = field(values, REL_TO_ENTITY_TOKENS)
  return ordered === undefined
    ? undefined
    : canonicalRearrangement(spliceNatoSubOrganisations(ordered, REL_TO_ENTITY_TOKENS), ordered)
}

/**
 * Documents write these bare where the CVE registers them qualified. Both forms
 * are accepted and normalised to the registered one. `admitsNonUs` holds that
 * rule, so a caller who reaches `canonicalize` directly gets the same tolerance
 * as one who uses `parse`.
 */
const qualifyNonUsControls = (
  values: readonly NonUsControl[] | undefined,
): readonly NonUsControl[] | undefined => values?.map((control) => admitsNonUs(control) ?? control)

/** An absent or empty field stays absent rather than becoming an empty array. */
const field = <T extends string>(
  values: readonly T[] | undefined,
  vocabulary: readonly string[],
): Canonical<T> | undefined =>
  values === undefined || values.length === 0 ? undefined : canonicalTokens(values, vocabulary)

/**
 * Builds a `Marking` from plain fields. Deduplicates each field and sorts it by
 * the governing vocabulary, keeping every control beside the compartments that
 * render from it.
 *
 * This is the single internal path that produces a `Marking`, so downstream
 * code can assume Canonical Order. Exported as `createMarking`: the internal
 * name says what it does to a value, and the public name says what you get.
 *
 * Idempotent, and typed to be. A `Marking` is valid input to it, which is what
 * lets `format` and `validate` accept either form.
 */
export const canonicalize = (input: MarkingInput): Marking => {
  const dissem = field(
    input.disseminationControls === undefined
      ? undefined
      : renderableDissem(input.disseminationControls),
    dissemOrder(markingKind(input)),
  )
  const sci = field(input.SCIcontrols, SCI_CONTROL_TOKENS)
  const aea = field(input.atomicEnergyMarkings, ATOMIC_ENERGY_MARKING_TOKENS)
  const relTo = releasability(input.releasableTo)
  const displayTo = releasability(input.displayOnlyTo)
  const fgiOpen = field(input.FGIsourceOpen, FGI_OPEN_ENTITY_TOKENS)
  const fgiProtected = field(input.FGIsourceProtected, FGI_PROTECTED_ENTITY_TOKENS)
  const nonIc = field(input.nonICmarkings, NON_IC_MARKING_TOKENS)
  const nonUs = field(qualifyNonUsControls(input.nonUSControls), NON_US_CONTROL_TOKENS)
  const cuiBasic = field(input.cuiBasic, CUI_BASIC_TOKENS)
  const cuiSpecified = field(input.cuiSpecified, CUI_SPECIFIED_TOKENS)
  const secondBanner = field(input.secondBannerLine, SECOND_BANNER_LINE_TOKENS)

  // Optional fields are spread in conditionally, not assigned as `undefined`, so
  // a Marking never holds a key it does not have. `exactOptionalPropertyTypes`
  // requires that, and structural equality depends on it. Written as one literal
  // so the result typechecks as a Marking with no cast.
  return {
    classification: input.classification,
    ownerProducer: canonicalNonEmpty(input.ownerProducer, OWNER_PRODUCER_TOKENS),
    ...(input.joint !== undefined && { joint: input.joint }),
    ...(sci !== undefined && { SCIcontrols: sci }),
    ...(aea !== undefined && { atomicEnergyMarkings: aea }),
    ...(dissem !== undefined && { disseminationControls: dissem }),
    ...(relTo !== undefined && { releasableTo: relTo }),
    ...(displayTo !== undefined && { displayOnlyTo: displayTo }),
    ...(fgiOpen !== undefined && { FGIsourceOpen: fgiOpen }),
    ...(fgiProtected !== undefined && { FGIsourceProtected: fgiProtected }),
    ...(nonIc !== undefined && { nonICmarkings: nonIc }),
    ...(nonUs !== undefined && { nonUSControls: nonUs }),
    ...(cuiBasic !== undefined && { cuiBasic }),
    ...(cuiSpecified !== undefined && { cuiSpecified }),
    ...(secondBanner !== undefined && { secondBannerLine: secondBanner }),
    ...(input.handleViaChannels !== undefined && {
      handleViaChannels: input.handleViaChannels,
    }),
  }
}

/** Public constructor: canonicalizes only representable dependent field combinations. */
export const createMarking = (input: MarkingInput): Marking => {
  const problem = hvcoChannelProblem(input.secondBannerLine, input.handleViaChannels)
  if (problem !== undefined) {
    throw new TypeError(problem)
  }
  return canonicalize(input)
}
