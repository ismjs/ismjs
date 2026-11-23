/**
 * The Marking: the set of security facts a marking string can carry.
 *
 * This is a strict subset of the ISM attribute set, on purpose. Anything no
 * Banner Line or Portion Mark can express is out, such as the Classification
 * Authority Block. See
 * docs/adr/0001-marking-is-the-string-expressible-projection.md.
 */
import type { Canonical, CanonicalNonEmpty, NonEmpty } from './canonical.ts'
import type { CuiBasic, CuiSpecified } from './generated/cui.ts'
import type {
  FgiOpenEntity,
  FgiProtectedEntity,
  OwnerProducer,
  RelToEntity,
} from './generated/ismcat.ts'
import { DISSEM_ORDER_COMMINGLED, DISSEM_ORDER_CUI, DISSEM_ORDER_IC } from './generated/order.ts'
import type { ACCM_PREFIX } from './syntax.ts'
import type { EXEMPT_FROM_DISCOVERY, NATO_PREFIX } from './tokens.ts'
import { UNCLASSIFIED } from './tokens.ts'
import type {
  AtomicEnergyMarking,
  DissemControl,
  NonIcMarking,
  NonUsControl,
  SciControl,
  SecondBannerLine,
  UsClassification,
} from './generated/vocab.ts'

/**
 * An SCI control, optionally carrying compartments: `SI-G`, `SI-G-ABCD`.
 *
 * Every atomic energy value is registered, down to `RD-SG-14`. SCI compartments
 * are different: they are programme names, and no vocabulary lists them, so the
 * type must admit a free suffix.
 */
export type SciExpression = SciControl | `${SciControl}-${string}`

/**
 * A NATO sub-organisation: `NATO:` and then a free name.
 *
 * The ISMCAT registers admit it as an `xsd:pattern` term,
 * `NATO:[a-zA-Z\-_]{1,256}`, not as an enumerated literal, so it cannot come
 * from a generated union. See
 * docs/adr/0003-vocabularies-are-generated-and-committed.md.
 *
 * The register admits the same pattern in `ownerProducer`. This type does not.
 * An organisation that owns a document is NATO ownership, a deferred capability
 * tracked in docs/roadmap.md; every corpus vector naming one is skipped explicitly.
 */
export type NatoSubOrganisation = `${typeof NATO_PREFIX}${string}`

export type RelToExpression = RelToEntity | NatoSubOrganisation
export type FgiOpenExpression = FgiOpenEntity | NatoSubOrganisation
export type FgiProtectedExpression = FgiProtectedEntity | NatoSubOrganisation

/**
 * A non-IC marking, or an Alternative Compensatory Control Measure.
 *
 * ACCM programme names are free text. The constraint on them,
 * `^ACCM-[A-Z0-9\-_]{1,61}$`, is normative only in the Schematron and appears in
 * no CVE, so there is no generated union to widen.
 */
export type NonIcExpression = NonIcMarking | `${typeof ACCM_PREFIX}${string}`

/**
 * A dissemination control that a marking string can actually carry.
 *
 * `EXEMPT_FROM_ICD501_DISCOVERY` is in the CVE and in the ISM attribute set, but
 * no Banner Line or Portion Mark renders it. The reference stylesheets skip it
 * by name. It is therefore outside the projection this type describes, like the
 * Classification Authority Block. Leaving it out prevents a sixth known loss in
 * addition to the five string-level losses tested explicitly. See
 * docs/adr/0001-marking-is-the-string-expressible-projection.md.
 */
export type RenderableDissemControl = Exclude<DissemControl, typeof EXEMPT_FROM_DISCOVERY>

/**
 * Whether a Marking is classic IC, pure CUI, or Commingled. This is not a
 * presentation choice. The kind selects which vocabulary governs Canonical Order
 * for the dissemination controls.
 *
 * `Marking` is not discriminated on this, on purpose. The kind is a total
 * function of the other fields: every combination of fields maps to exactly one
 * kind, and no combination is illegal. A union would divide a space that is
 * already total, and force callers to narrow for no added safety. `markingKind`
 * derives the kind on demand, which leaves one source of truth.
 */
export const MarkingKind = {
  Ic: 'ic',
  Cui: 'cui',
  Commingled: 'commingled',
} as const

export type MarkingKind = (typeof MarkingKind)[keyof typeof MarkingKind]

export type Marking = {
  readonly classification: UsClassification
  /** ISM requires at least one owner-producer, so this is never empty. */
  readonly ownerProducer: CanonicalNonEmpty<OwnerProducer>
  readonly joint?: boolean
  readonly SCIcontrols?: Canonical<SciExpression>
  readonly atomicEnergyMarkings?: Canonical<AtomicEnergyMarking>
  readonly disseminationControls?: Canonical<RenderableDissemControl>
  readonly releasableTo?: Canonical<RelToExpression>
  readonly displayOnlyTo?: Canonical<RelToExpression>
  readonly FGIsourceOpen?: Canonical<FgiOpenExpression>
  readonly FGIsourceProtected?: Canonical<FgiProtectedExpression>
  readonly nonICmarkings?: Canonical<NonIcExpression>
  readonly nonUSControls?: Canonical<NonUsControl>
  readonly cuiBasic?: Canonical<CuiBasic>
  readonly cuiSpecified?: Canonical<CuiSpecified>
  readonly secondBannerLine?: Canonical<SecondBannerLine>
  /**
   * Non-empty channel text for `HVCO`. It is invalid without `HVCO`, and cannot
   * contain `/`, `|`, CR, or LF because those delimit second Banner Line syntax.
   * `createMarking` enforces this dependent contract and `validate` reports it.
   */
  readonly handleViaChannels?: string
}

/**
 * Input accepts every dissemination control the CVE defines, including the one
 * no string can render. `canonicalize` removes it, so the dissemination field can
 * be populated directly from ISM attributes without a preliminary filter.
 */
type DissemControlInput = readonly DissemControl[]

/**
 * A Marking as a caller supplies it: plain arrays, any order, duplicates
 * permitted.
 *
 * The mapping is homomorphic over `Marking`, so each field keeps its own
 * optionality. `ownerProducer` stays required and the rest stay optional.
 * `ownerProducer` must also be non-empty, which is the one shape rule the type
 * system can enforce by itself.
 */
export type MarkingInput = {
  readonly [K in keyof Marking]: Marking[K] extends Canonical<infer T> | undefined
    ? K extends 'ownerProducer'
      ? NonEmpty<T>
      : K extends 'disseminationControls'
        ? DissemControlInput
        : readonly T[]
    : Marking[K]
}

// ---------------------------------------------------------------------------

/**
 * Dissemination controls valid on a pure CUI Marking. A Marking carrying any
 * other control is Commingled rather than pure, because those controls come
 * from the classic register.
 */
const CUI_DISSEM = new Set<string>(DISSEM_ORDER_CUI)

/**
 * Whether a dissemination control is one the CUI register admits.
 *
 * Exported because two questions need it and they must not drift: which
 * vocabulary governs a Marking (here), and whether `CUI` may lead a rendered
 * string (`segments.ts`). The reference asks it as `ism-func:get.dissemNotCUI`
 * in one place and both callers read that one answer.
 */
export const isCuiDissem = (control: string): boolean => CUI_DISSEM.has(control)

/**
 * Mirrors `CUIandICcontrolMarkings` in `IC-ISM-PortionMark.xsl`, which selects
 * the vocabulary that orders a Marking's dissemination controls: CUI is
 * Commingled when the Marking also carries classic markings, or is classified
 * above U.
 *
 * Reads the fields directly, and must. The reference has three predicates over
 * roughly these terms, and this is the one that tests raw attribute values —
 * the other two test *rendered* segments, which is not the same question. See
 * `leadsWithCui` in `segments.ts`.
 *
 * Takes `MarkingInput`, so it runs before canonicalisation and has to treat an
 * empty array as absent. A `Marking` cannot hold one: `normalize.ts` drops
 * empties, which is why the same tests read `=== undefined` downstream.
 */
export const markingKind = (marking: MarkingInput): MarkingKind => {
  const hasCui = (marking.cuiBasic?.length ?? 0) > 0 || (marking.cuiSpecified?.length ?? 0) > 0
  if (!hasCui) {
    return MarkingKind.Ic
  }

  const hasClassicMarkings =
    (marking.SCIcontrols?.length ?? 0) > 0 ||
    (marking.atomicEnergyMarkings?.length ?? 0) > 0 ||
    (marking.FGIsourceOpen?.length ?? 0) > 0 ||
    (marking.FGIsourceProtected?.length ?? 0) > 0 ||
    // `nonICmarkings` belongs here because the reference tests it here. A
    // Marking carrying both is forbidden outright by ISM-ID-00486, so this
    // changes no legal marking — but leaving the term out made this predicate
    // disagree with the reference and with `leadsWithCui` for no reason.
    (marking.nonICmarkings?.length ?? 0) > 0 ||
    (marking.disseminationControls ?? []).some((d) => !isCuiDissem(d))

  return hasClassicMarkings || marking.classification !== UNCLASSIFIED
    ? MarkingKind.Commingled
    : MarkingKind.Cui
}

/**
 * The vocabulary governing a Marking's dissemination controls.
 *
 * A `Record` keyed by the kind rather than a switch, so adding a kind is a
 * compile error here rather than a silent fall through to the classic order.
 */
const DISSEM_ORDER_BY_KIND: Readonly<Record<MarkingKind, readonly DissemControl[]>> = {
  [MarkingKind.Ic]: DISSEM_ORDER_IC,
  [MarkingKind.Cui]: DISSEM_ORDER_CUI,
  [MarkingKind.Commingled]: DISSEM_ORDER_COMMINGLED,
}

export const dissemOrder = (kind: MarkingKind): readonly DissemControl[] =>
  DISSEM_ORDER_BY_KIND[kind]

/** A field's values, whether it holds one or many. */
export const valuesOf = (marking: Marking, field: keyof Marking): readonly string[] => {
  const held = marking[field]
  if (typeof held === 'string') {
    return [held]
  }
  return Array.isArray(held) ? held : []
}
