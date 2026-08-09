/**
 * Generates Markings for the round-trip property.
 *
 * The corpus proves that `parse` reads the 139 markings ODNI wrote down. This
 * generates markings nobody wrote down, from the same vocabularies, to reach the
 * combinations the corpus does not.
 *
 * The generator holds the shape rules, and `lossy` lists only true rendering
 * losses. A Marking that names releasability entities with no `REL` to render
 * them under is not a round-trip failure. It is a Marking no document can carry,
 * so the generator does not make one.
 */
import fc from 'fast-check'
import { CUI_BASIC_TOKENS, CUI_SPECIFIED_TOKENS } from '../src/generated/cui.ts'
import {
  FGI_MARKER,
  FGI_OPEN_ENTITY_TOKENS,
  OWNER_PRODUCER_TOKENS,
  REL_TO_ENTITY_TOKENS,
} from '../src/generated/ismcat.ts'
import {
  ATOMIC_ENERGY_MARKING_TOKENS,
  DISSEM_CONTROL_TOKENS,
  NON_IC_MARKING_TOKENS,
  SCI_CONTROL_TOKENS,
  SECOND_BANNER_LINE_TOKENS,
  US_CLASSIFICATION_TOKENS,
} from '../src/generated/vocab.ts'
import type { Draft } from '../src/draft.ts'
import type { Issue } from '../src/issue.ts'
import type { MarkingInput } from '../src/marking.ts'
import { checkDraft } from '../src/check.ts'
import { ACCM_PREFIX, COMPARTMENT } from '../src/syntax.ts'
import {
  ATOMAL,
  BALK,
  BOHEMIA,
  DISPLAY_ONLY,
  EYES,
  HVCO,
  NATO,
  OC,
  OC_USGOV,
  REL,
  USA,
} from '../src/tokens.ts'

/** A non-empty subset, in vocabulary order. `canonicalize` sorts anyway. */
const subsetOf = <T extends string>(vocabulary: readonly T[], max: number): fc.Arbitrary<T[]> =>
  fc
    .uniqueArray(fc.constantFrom(...vocabulary), { minLength: 1, maxLength: max })
    .map((values) => values.toSorted((a, b) => vocabulary.indexOf(a) - vocabulary.indexOf(b)))

/** `undefined` as often as a value, since an absent field is the common case. */
const sometimes = <T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.option(arbitrary, { nil: undefined, freq: 3 })

/**
 * Every ancestor of a token. Rendering emits only the last hyphen-separated
 * part and builds the rest from the ancestors, so `RD-SG-14` on its own renders
 * as ` 14`.
 */
const withAncestors = (token: string, vocabulary: readonly string[]): readonly string[] => {
  const parts = token.split(COMPARTMENT)
  const chain = parts.map((_, index) => parts.slice(0, index + 1).join(COMPARTMENT))
  return chain.filter((step) => step === token || vocabulary.includes(step))
}

const compartmented = (vocabulary: readonly string[], max: number): fc.Arbitrary<string[]> =>
  fc
    .uniqueArray(fc.constantFrom(...vocabulary), { minLength: 1, maxLength: max })
    .map((tokens) =>
      Array.from(new Set(tokens.flatMap((token) => withAncestors(token, vocabulary)))),
    )

/**
 * An SCI control with a free Compartment. Compartments are programme names and
 * no vocabulary lists them, so they are the one part of a Marking that does not
 * come from a register.
 */
const sciExpression = fc
  .tuple(fc.constantFrom(...SCI_CONTROL_TOKENS), fc.stringMatching(/^[A-Z]{3,5}$/u), fc.boolean())
  .map(([control, compartment, bare]) =>
    bare
      ? withAncestors(control, SCI_CONTROL_TOKENS)
      : withAncestors(`${control}${COMPARTMENT}${compartment}`, SCI_CONTROL_TOKENS),
  )

const sciControls = fc
  .array(sciExpression, { minLength: 1, maxLength: 3 })
  .map((runs) => Array.from(new Set(runs.flat())))

// Ownership generated here is either singular or explicitly joint. Other
// multi-owner forms are covered by the official corpus; excluding them keeps
// this generator focused on values with an unconditional round trip. Only a
// US-controlled document shows FGI, so ownership and FGI travel together below.
const trigraph = fc.constantFrom(...OWNER_PRODUCER_TOKENS.filter((o) => o !== NATO))

const ownership = fc.oneof(
  { arbitrary: fc.constant({ ownerProducer: [USA] as const, joint: false }), weight: 3 },
  { arbitrary: trigraph.map((o) => ({ ownerProducer: [o] as const, joint: false })), weight: 1 },
  {
    arbitrary: fc
      .uniqueArray(trigraph, { minLength: 2, maxLength: 3 })
      .map((owners) => ({ ownerProducer: owners, joint: true })),
    weight: 1,
  },
)

/** FGI, in the one form a string can carry it: open sources, or the bare marker. */
const fgi = fc.oneof(
  { arbitrary: fc.constant({}), weight: 4 },
  {
    arbitrary: subsetOf(FGI_OPEN_ENTITY_TOKENS, 3).map((open) => ({ FGIsourceOpen: open })),
    weight: 1,
  },
  { arbitrary: fc.constant({ FGIsourceProtected: [FGI_MARKER] }), weight: 1 },
)

const releasabilityEntities = fc
  .uniqueArray(fc.constantFrom(...REL_TO_ENTITY_TOKENS), { minLength: 1, maxLength: 3 })
  .map((entities) => [USA].concat(entities.filter((e) => e !== USA)))

/**
 * `OC-USGOV` consumes `OC` when it renders, so the attribute set must hold both.
 * ISM-ID-00302 requires it. This is the same shape as an SCI control that keeps
 * its ancestors.
 */
const withOrcon = (controls: readonly string[]): string[] => {
  const out = [...controls]
  if (out.includes(OC_USGOV) && !out.includes(OC)) {
    out.unshift(OC)
  }
  return out
}

const dissemControls = fc
  .uniqueArray(fc.constantFrom(...DISSEM_CONTROL_TOKENS), { maxLength: 4 })
  // `EYES ONLY` renders its list separated by slashes, and a slash also
  // separates one dissemination control from the next. The list is therefore
  // unambiguous only as the last entry, which is what `REL` and `EYES` being
  // mutually exclusive means. They never occur together in the corpus.
  .map((controls) => (controls.includes(REL) ? controls.filter((c) => c !== EYES) : controls))
  .map((controls) => withOrcon(controls))

/**
 * Fields on their way into a Marking. They hold plain strings because that is
 * what the vocabularies are read out as; `anyMarking` converts once, at the end.
 */
type Fields = Readonly<Record<string, unknown>>

/** The lists `REL`, `EYES` and `DISPLAYONLY` render under, present only with them. */
const releasability = (controls: readonly string[]): fc.Arbitrary<Fields> => {
  const needsRelTo = controls.includes(REL) || controls.includes(EYES)
  return fc.record({
    ...(needsRelTo && { releasableTo: releasabilityEntities }),
    ...(controls.includes(DISPLAY_ONLY) && { displayOnlyTo: releasabilityEntities }),
  })
}

/** Non-US controls ride on the segment they qualify, so they need one to exist. */
const nonUsControls = (hasSci: boolean, hasAtomic: boolean): fc.Arbitrary<string[]> => {
  const available = [...(hasSci ? [BOHEMIA, BALK] : []), ...(hasAtomic ? [ATOMAL] : [])]
  return available.length === 0
    ? fc.constant([])
    : fc.uniqueArray(fc.constantFrom(...available), { maxLength: available.length })
}

/** ACCM programme names are free text, spelled with spaces where they hold `_`. */
const accm = fc.stringMatching(/^[A-Z]{3,6}(_[A-Z]{3,6})?$/u).map((name) => `${ACCM_PREFIX}${name}`)

const nonIcMarkings = fc
  .tuple(
    fc.uniqueArray(fc.constantFrom(...NON_IC_MARKING_TOKENS), { maxLength: 3 }),
    sometimes(accm),
  )
  .map(([registered, programme]) =>
    (registered as string[]).concat(programme === undefined ? [] : [programme]),
  )
  .filter((markings) => markings.length > 0)

/** `HVCO` names its channels inside its own description, so the two travel together. */
const withChannels = ([lines, channels]: [string[], string]): Fields =>
  lines.includes(HVCO)
    ? { secondBannerLine: lines, handleViaChannels: channels }
    : { secondBannerLine: lines }

const secondBanner = fc
  .tuple(subsetOf(SECOND_BANNER_LINE_TOKENS, 3), fc.stringMatching(/^[A-Z]{3,8}( [A-Z]{3,8})?$/u))
  .map((parts) => withChannels(parts))

export const anyMarking: fc.Arbitrary<MarkingInput> = fc
  .record({
    classification: fc.constantFrom(...US_CLASSIFICATION_TOKENS),
    ownership,
    fgi,
    sci: sometimes(sciControls),
    atomic: sometimes(compartmented(ATOMIC_ENERGY_MARKING_TOKENS, 3)),
    dissem: dissemControls,
    cuiBasic: sometimes(subsetOf(CUI_BASIC_TOKENS, 3)),
    cuiSpecified: sometimes(subsetOf(CUI_SPECIFIED_TOKENS, 3)),
    nonIc: sometimes(nonIcMarkings),
    second: sometimes(secondBanner),
  })
  .chain((parts) => {
    // FGI is only marked on a US-controlled document. CUI is a US Executive
    // Branch construct and has no place on a foreign or joint marking: a pure
    // CUI Marking leads with `CUI` instead of the classification, and that
    // leaves nowhere to name the owners.
    const usOwned =
      parts.ownership.ownerProducer.length === 1 && parts.ownership.ownerProducer[0] === USA
    const fgiFields = usOwned ? parts.fgi : {}
    const cui = usOwned
      ? {
          ...(parts.cuiBasic !== undefined && { cuiBasic: parts.cuiBasic }),
          ...(parts.cuiSpecified !== undefined && { cuiSpecified: parts.cuiSpecified }),
        }
      : {}

    // Assembled as a Draft, which holds plain text like everything `parse`
    // reads. Fields are set by assignment, not by spreading a conditional into
    // an object literal: an absent field must be an absent key. That is what
    // `exactOptionalPropertyTypes` requires and what structural equality needs.
    const assemble = ([lists, nonUs]: [Fields, string[]]): MarkingInput => {
      const marking: Draft = {
        classification: parts.classification,
        ownerProducer: parts.ownership.ownerProducer,
        ...lists,
        ...fgiFields,
        ...cui,
        ...parts.second,
      }
      if (parts.ownership.joint) {
        marking['joint'] = true
      }
      if (parts.sci !== undefined) {
        marking['SCIcontrols'] = parts.sci
      }
      if (parts.atomic !== undefined) {
        marking['atomicEnergyMarkings'] = parts.atomic
      }
      if (parts.dissem.length > 0) {
        marking['disseminationControls'] = parts.dissem
      }
      if (parts.nonIc !== undefined) {
        marking['nonICmarkings'] = parts.nonIc
      }
      if (nonUs.length > 0) {
        marking['nonUSControls'] = nonUs
      }
      // Checked, not asserted, through the same function `parse` uses. A
      // generated Marking that the vocabularies reject is a fault in this file.
      // Fail here rather than pass it into the property.
      const issues: Issue[] = []
      const checked = checkDraft(marking, issues)
      if (checked === undefined) {
        throw new TypeError(issues.map((i) => i.message).join('; '))
      }
      return checked
    }

    return fc
      .tuple(
        releasability(parts.dissem),
        nonUsControls(parts.sci !== undefined, parts.atomic !== undefined),
      )
      .map((built) => assemble(built))
  })
