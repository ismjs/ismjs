/**
 * Rules written out, because no harvested shape expresses them.
 *
 * `cross-field.ts` is driven from tables the harvester fills. These are the
 * rules whose XPath says something a table cannot: a position in a list, a count
 * of entries, a token derived from another token, a choice between three
 * conditions.
 *
 * Only the logic is written here. Each id and each message still comes from the
 * corpus through `HAND_WRITTEN_RULES`, so a rule that leaves the specification
 * fails codegen rather than leaving `validate` reporting an id that is gone.
 *
 * Every one of these is conditioned on `ISM_USGOV_RESOURCE` in the Schematron,
 * which derives from `compliesWith` and which no Marking holds. The library
 * reads that condition as true throughout. See docs/risks.md.
 */
import { HAND_WRITTEN_RULES } from './generated/rules.ts'
import { expandEntities } from './entities.ts'
import { type Issue, IssueCode, Severity, issue } from './issue.ts'
import type { Marking } from './marking.ts'
import { COMPARTMENT } from './syntax.ts'
import { FGI_MARKER } from './generated/ismcat.ts'
import { EYES, NATO, NATO_PREFIX, USA } from './tokens.ts'

type Id = keyof typeof HAND_WRITTEN_RULES
type Checker = (marking: Marking, issues: Issue[]) => void

const say = (id: Id, field: keyof Marking, token?: string): Issue =>
  issue({
    code: IssueCode.Inconsistent,
    severity: Severity.Error,
    message: HAND_WRITTEN_RULES[id],
    ruleId: id,
    field,
    ...(token === undefined ? {} : { token }),
  })

/**
 * A joint marking must release to every owner it names.
 *
 * This is why coalition membership is in the codec. `//JOINT S USA GBR` released
 * `REL TO USA, FVEY` is legal, because `FVEY` stands for five countries and
 * `GBR` is one of them. To compare the lists as written would reject it.
 */
const jointReleasability = (marking: Marking, issues: Issue[]): void => {
  if (marking.joint !== true) {
    return
  }
  const released = new Set(expandEntities(marking.releasableTo ?? []))
  for (const owner of marking.ownerProducer.filter((o) => !released.has(o))) {
    issues.push(say('ISM-ID-00377', 'ownerProducer', owner))
  }
}

/**
 * A Marking carrying CUI may not carry non-IC markings.
 *
 * Nobody has decided how it would render. ISM.XML forbids the combination
 * "pending resolution of where @ism:nonICcontrols should appear in a commingled
 * banner", and no resolution is coming: DoD guidance does not carry CUI markings
 * to a classified banner at all. See docs/risks.md.
 *
 * The Schematron keys on `compliesWith`, so the CUI categories stand in for it.
 */
const cuiExcludesNonIc = (marking: Marking, issues: Issue[]): void => {
  const hasCui = marking.cuiBasic !== undefined || marking.cuiSpecified !== undefined
  if (hasCui && marking.nonICmarkings !== undefined) {
    issues.push(say('ISM-ID-00486', 'nonICmarkings'))
  }
}

/** `FGI` in `ownerProducer` conceals the owner, so it cannot name one as well. */
const fgiOwnerIsAlone = (marking: Marking, issues: Issue[]): void => {
  if (marking.ownerProducer.includes(FGI_MARKER) && marking.ownerProducer.length > 1) {
    issues.push(say('ISM-ID-00099', 'ownerProducer'))
  }
}

/** The same rule for the protected source: the marker excludes named countries. */
const fgiProtectedIsAlone = (marking: Marking, issues: Issue[]): void => {
  const sources: readonly string[] = marking.FGIsourceProtected ?? []
  if (sources.includes(FGI_MARKER) && sources.length > 1) {
    issues.push(say('ISM-ID-00217', 'FGIsourceProtected'))
  }
}

/** `NATO` itself, or one of its sub-organisations. */
const isNato = (entity: string): boolean => entity === NATO || entity.startsWith(NATO_PREFIX)

/**
 * A non-US control needs a NATO source to ride on.
 *
 * `ATOMAL`, `BOHEMIA` and `BALK` are NATO controls. The Marking must be owned by
 * NATO, name NATO as an open FGI source, or conceal its source entirely.
 */
const nonUsControlNeedsNato = (marking: Marking, issues: Issue[]): void => {
  if (marking.nonUSControls === undefined) {
    return
  }
  const owned = marking.ownerProducer.some((o) => isNato(o))
  const sourced = (marking.FGIsourceOpen ?? []).some((s) => isNato(s))
  if (!owned && !sourced && marking.FGIsourceProtected === undefined) {
    issues.push(say('ISM-ID-00163', 'nonUSControls'))
  }
}

/**
 * A releasability list names the USA first.
 *
 * The order is Canonical Order's, so `createMarking` already produces it. This
 * catches the list that has no `USA` at all, which ordering cannot fix.
 */
const releasableToStartsWithUsa = (marking: Marking, issues: Issue[]): void => {
  const entities = marking.releasableTo
  if (entities !== undefined && entities[0] !== USA) {
    issues.push(say('ISM-ID-00214', 'releasableTo'))
  }
}

/**
 * Releasing to the USA alone releases to nobody.
 *
 * A US-owned Marking already reaches the USA, so `REL TO USA` on its own says
 * nothing. The rule reads it as an unfinished marking rather than a narrow one.
 */
const releasableToNamesAnother = (marking: Marking, issues: Issue[]): void => {
  const entities = marking.releasableTo
  if (marking.ownerProducer.includes(USA) && entities !== undefined && entities.length < 2) {
    issues.push(say('ISM-ID-00319', 'releasableTo'))
  }
}

/** `EYES ONLY` is the Five Eyes, and releases to no one else. */
const FIVE_EYES: ReadonlySet<string> = new Set([USA, 'AUS', 'CAN', 'GBR', 'NZL'])

const eyesOnlyIsFiveEyes = (marking: Marking, issues: Issue[]): void => {
  const controls: readonly string[] = marking.disseminationControls ?? []
  if (!controls.includes(EYES)) {
    return
  }
  for (const entity of marking.releasableTo ?? []) {
    if (!FIVE_EYES.has(entity)) {
      issues.push(say('ISM-ID-00345', 'releasableTo', entity))
    }
  }
}

/**
 * Every SCI compartment names the control it hangs off.
 *
 * `SI-G-ABCD` needs `SI-G`, which needs `SI`. Rendering depends on it: only the
 * last hyphen-separated part is emitted, and the ancestors supply the rest, so a
 * Marking missing one renders as `-G ABCD`. `compartment.ts` states the same
 * fact from the writing side.
 *
 * The parent is everything before the last hyphen, and only a hyphen followed by
 * a letter starts a compartment. That is what keeps this off the atomic energy
 * markings, where `RD-SG-14` hangs off `RD` and `RD-SG` is not a token.
 */
const COMPARTMENTED = /-[A-Z]/u

const sciCompartmentNamesItsControl = (marking: Marking, issues: Issue[]): void => {
  const controls: readonly string[] = marking.SCIcontrols ?? []
  for (const token of controls) {
    if (!COMPARTMENTED.test(token)) {
      continue
    }
    const parent = token.slice(0, token.lastIndexOf(COMPARTMENT))
    if (!controls.includes(parent)) {
      issues.push(say('ISM-ID-00388', 'SCIcontrols', token))
    }
  }
}

/**
 * One checker per generated hand-written rule, in stable reporting order.
 *
 * `Record<Id, Checker>` makes a DES change fail typechecking until its new rule
 * is implemented, and rejects a checker for an ID the authority corpus removed.
 */
const WRITTEN_RULE_CHECKERS = {
  'ISM-ID-00377': jointReleasability,
  'ISM-ID-00486': cuiExcludesNonIc,
  'ISM-ID-00099': fgiOwnerIsAlone,
  'ISM-ID-00217': fgiProtectedIsAlone,
  'ISM-ID-00163': nonUsControlNeedsNato,
  'ISM-ID-00214': releasableToStartsWithUsa,
  'ISM-ID-00319': releasableToNamesAnother,
  'ISM-ID-00345': eyesOnlyIsFiveEyes,
  'ISM-ID-00388': sciCompartmentNamesItsControl,
} satisfies Record<Id, Checker>

export const checkWrittenRules = (marking: Marking, issues: Issue[]): void => {
  for (const check of Object.values(WRITTEN_RULE_CHECKERS)) {
    check(marking, issues)
  }
}
