/**
 * Checking a Marking against the data-driven rules ODNI publishes.
 *
 * Membership, mutual-exclusion, deprecation, and harvestable cross-field rules
 * are generated into `src/generated/rules.ts` with their official ISM-IDs.
 * Rules whose XPath cannot be represented faithfully by those tables keep
 * generated identities and wording but use explicit logic in `written-rules.ts`.
 *
 * Most of the 535-rule corpus needs a document, not a Marking — Notices,
 * Need-to-Know, the Rollup — and ADR-0001 puts those outside the projection.
 * See docs/adr/0001-marking-is-the-string-expressible-projection.md.
 *
 * `validate` is separate from `parse` on purpose. Parsing establishes that a
 * string says something. Validation establishes that what it says is permitted.
 * A marking on a real document can be readable and still break a rule, and to
 * refuse to read it would stop the library finding that.
 *
 * `validate` is the orchestration seam; there is deliberately no generic rule
 * engine behind it. Register membership, generated cross-field relationships,
 * written rules, and deployment profiles are distinct domain concepts. Each new
 * rule shape belongs with the module that represents its semantics rather than
 * in a forwarding container shared only because all of them report Issues.
 */
import {
  admitsAtomic,
  admitsClassification,
  admitsCuiBasic,
  admitsCuiSpecified,
  admitsDissem,
  admitsFgiOpen,
  admitsFgiProtected,
  admitsNonIc,
  admitsNonUs,
  admitsOwnerProducer,
  admitsRelTo,
  admitsSci,
  admitsSecondBannerLine,
} from './admit.ts'
import type { Admits } from './admit.ts'
import {
  FGI_OPEN_ENTITY_PATTERNS,
  FGI_OPEN_ENTITY_TOKENS,
  FGI_PROTECTED_ENTITY_PATTERNS,
  FGI_PROTECTED_ENTITY_TOKENS,
  ISMCAT_DEPRECATED,
  OWNER_PRODUCER_PATTERNS,
  OWNER_PRODUCER_TOKENS,
  REL_TO_ENTITY_PATTERNS,
  REL_TO_ENTITY_TOKENS,
} from './generated/ismcat.ts'
import { ACCM_PATTERN, DEPRECATION, MEMBERSHIP, MUTUALLY_EXCLUSIVE } from './generated/rules.ts'
import { NON_IC_MARKING_TOKENS } from './generated/vocab.ts'
import { type Issue, IssueCode, Severity, issue } from './issue.ts'
import type { Marking, MarkingInput } from './marking.ts'
import { canonicalize } from './normalize.ts'
import { parse } from './parse.ts'
import { checkCrossField } from './cross-field.ts'
import { type Profile, checkProfile } from './profile.ts'
import { valuesOf } from './marking.ts'

export type ValidateOptions = {
  /**
   * The date the marked resource was created, as `YYYY-MM-DD`.
   *
   * Deprecation is reported against this date, as `dvf:deprecated` does. A token
   * retired before the resource was created is an error. One retired on or after
   * that date is a warning. With no date, neither is reported. The reference
   * implementation reads the date from `ISM_RESOURCE_CREATE_DATE` and reports
   * nothing when the document does not carry one.
   */
  readonly createdOn?: string

  /**
   * What this deployment may issue. A value outside it is reported as
   * `outside-profile`: legal ISM that this application must not produce. See
   * `profile.ts`. A profile is not a security boundary.
   */
  readonly profile?: Profile
}

// ---------------------------------------------------------------------------

type Field = keyof typeof MEMBERSHIP

/** A CVE pattern term is an unanchored string. To match one is to match it whole. */
const anchored = (patterns: readonly string[]): readonly RegExp[] =>
  patterns.map((p) => new RegExp(`^${p}$`, 'u'))

/** Every field a rule can name, paired with the vocabulary that admits it. */
const FIELD_ADMITS: Readonly<Record<Field, Admits<string>>> = {
  classification: admitsClassification,
  ownerProducer: admitsOwnerProducer,
  SCIcontrols: admitsSci,
  atomicEnergyMarkings: admitsAtomic,
  disseminationControls: admitsDissem,
  releasableTo: admitsRelTo,
  displayOnlyTo: admitsRelTo,
  FGIsourceOpen: admitsFgiOpen,
  FGIsourceProtected: admitsFgiProtected,
  nonICmarkings: admitsNonIc,
  nonUSControls: admitsNonUs,
  cuiBasic: admitsCuiBasic,
  cuiSpecified: admitsCuiSpecified,
  secondBannerLine: admitsSecondBannerLine,
}

/**
 * The register patterns, which are stricter than the types or `parse`.
 *
 * `admit.ts` must be permissive about pattern terms. It works on a rendered
 * string and cannot know the character class of the register, so `NATO:123` and
 * `ACCM-lower` both pass it. Neither passes here. That difference is why
 * `validate` is a separate function: to read a marking and to approve it are not
 * the same act.
 */
const FIELD_PATTERNS: Readonly<Partial<Record<Field, readonly RegExp[]>>> = {
  ownerProducer: anchored(OWNER_PRODUCER_PATTERNS),
  releasableTo: anchored(REL_TO_ENTITY_PATTERNS),
  displayOnlyTo: anchored(REL_TO_ENTITY_PATTERNS),
  FGIsourceOpen: anchored(FGI_OPEN_ENTITY_PATTERNS),
  FGIsourceProtected: anchored(FGI_PROTECTED_ENTITY_PATTERNS),
  nonICmarkings: [new RegExp(ACCM_PATTERN, 'u')],
}

/** The literal terms of each register that also has patterns, to tell the two apart. */
const REGISTERED: Readonly<Partial<Record<Field, ReadonlySet<string>>>> = {
  ownerProducer: new Set<string>(OWNER_PRODUCER_TOKENS),
  releasableTo: new Set<string>(REL_TO_ENTITY_TOKENS),
  displayOnlyTo: new Set<string>(REL_TO_ENTITY_TOKENS),
  FGIsourceOpen: new Set<string>(FGI_OPEN_ENTITY_TOKENS),
  FGIsourceProtected: new Set<string>(FGI_PROTECTED_ENTITY_TOKENS),
  nonICmarkings: new Set<string>(NON_IC_MARKING_TOKENS),
}

// ---------------------------------------------------------------------------

/**
 * Every token is a value its register admits.
 *
 * A value passes if the register holds it, or if it matches one of the
 * register's own pattern terms. To pass `admit.ts` is not enough. That is the
 * reading gate, and it is looser on purpose.
 *
 * **`SCIcontrols` is a recorded relaxation of ISM-ID-00267.** Read strictly,
 * that rule anchors every token against the register, which would reject
 * `SI-G-ABCD`. ODNI's own unskipped XSpec vectors carry that token, and
 * `RSV-ABC` and `RSV-DEF` as well. Compartments are programme names, and the
 * public package does not list them, so a literal reading would reject markings
 * ODNI publishes as correct. The stem is checked instead, which is the strongest
 * check the public data supports.
 */
const checkMembership = (marking: Marking, issues: Issue[]): void => {
  for (const [field, ruleId] of Object.entries(MEMBERSHIP)) {
    const key = field as Field
    const admits = FIELD_ADMITS[key]
    const patterns = FIELD_PATTERNS[key]

    for (const value of valuesOf(marking, field as keyof Marking)) {
      const admitted = admits(value) !== undefined
      const matches = patterns?.some((p) => p.test(value)) ?? false
      // A field with pattern terms must satisfy the pattern. Nothing else may.
      if (
        !admitted ||
        (patterns !== undefined && REGISTERED[key]?.has(value) !== true && !matches)
      ) {
        issues.push(
          issue({
            code: IssueCode.UnknownToken,
            severity: Severity.Error,
            message: `${value} is not a value ${field} admits`,
            ruleId,
            field,
            token: value,
          }),
        )
      }
    }
  }
}

/** Tokens the register declares mutually exclusive, at most one of each set. */
const checkMutualExclusion = (marking: Marking, issues: Issue[]): void => {
  for (const rule of MUTUALLY_EXCLUSIVE) {
    // Widened on purpose. Each rule's `tokens` is a tuple of literals, so across
    // the union `includes` would accept only a value present in every rule's
    // list, and no value is.
    const tokens: readonly string[] = rule.tokens
    const held = valuesOf(marking, rule.field).filter((v) => tokens.includes(v))
    if (held.length > 1) {
      issues.push(
        issue({
          code: IssueCode.MutuallyExclusive,
          severity: Severity.Error,
          message: `${held.join(' and ')} are mutually exclusive in ${rule.field}`,
          ruleId: rule.id,
          field: rule.field,
        }),
      )
    }
  }
}

/**
 * Retired tokens.
 *
 * ISMCAT is the only register in this release that retires anything: 18
 * entities, from `AOSC` in 2005 to `RSMA` and `SPAA` in 2021. Only the four
 * fields that draw on it can report. The other ten deprecation rules are carried
 * anyway, because a future DES release may give them something to say.
 */
const checkDeprecation = (marking: Marking, createdOn: string, issues: Issue[]): void => {
  const retired: Readonly<Record<string, string>> = ISMCAT_DEPRECATED

  for (const [field, ids] of Object.entries(DEPRECATION)) {
    for (const value of valuesOf(marking, field as keyof Marking)) {
      const on = retired[value]
      if (on === undefined) {
        continue
      }
      // `dvf:deprecated` compares the creation date of the resource with the
      // deprecation date. Strictly after is an error. On or before is a warning.
      const isError = createdOn > on
      issues.push(
        issue({
          code: IssueCode.Deprecated,
          severity: isError ? Severity.Error : Severity.Warning,
          message: `${value} was deprecated on ${on} and is not authorised for use after it`,
          ruleId: isError ? ids.error : ids.warning,
          field,
          token: value,
        }),
      )
    }
  }
}

/**
 * Check a marking against the supported ODNI and optional profile rules.
 *
 * Takes a string as readily as a set of fields. "Is this a legal marking?" is
 * one question, although answering it takes two steps. A string that cannot be
 * read comes back with the reasons, which is an answer to what is wrong with it.
 *
 * Not folded into `parse`, on purpose. Validation cannot report deprecation
 * without the age of the document, and to read a marking off an old document is
 * a real need. `parse` answers what a string says. This answers whether it is
 * allowed to say it.
 *
 * Returns every issue, not the first, because a marking is corrected as a whole.
 * An empty result means the marking breaks none of the rules this library
 * implements. It does not mean the marking is valid, which no library can say
 * without the document around it.
 */
export const validate = (
  input: string | MarkingInput,
  options: ValidateOptions = {},
): readonly Issue[] => {
  if (typeof input !== 'string') {
    return checkMarking(input, options)
  }
  // Lenient, so that order alone does not stop the rules being checked. `parse`
  // still reports the order, as a warning.
  const result = parse(input, { strict: false })
  return result.ok ? [...result.issues, ...checkMarking(result.marking, options)] : result.issues
}

const checkMarking = (input: MarkingInput, options: ValidateOptions): readonly Issue[] => {
  // Canonicalised on the way in, for the same reason `format` does it. A caller
  // who holds a plain object must not have to convert it first.
  const marking = canonicalize(input)
  const issues: Issue[] = []

  checkMembership(marking, issues)
  checkMutualExclusion(marking, issues)
  checkCrossField(marking, issues)
  if (options.profile !== undefined) {
    checkProfile(marking, options.profile, issues)
  }
  if (options.createdOn !== undefined) {
    checkDeprecation(marking, options.createdOn, issues)
  }

  return issues
}
