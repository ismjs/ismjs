/**
 * Rules that relate two fields rather than constraining one.
 *
 * Most say "if this field holds any of these tokens, that field must hold one of
 * those". The earlier implementation encoded that by hand, as `clsf` and `yes`.
 * Here it is harvested.
 *
 * Nine more are written out in `written-rules.ts`, where the XPath says
 * something no table expresses.
 */
import { FIELD_PRESENCE, FORBIDS, REQUIRES } from './generated/rules.ts'
import { hvcoChannelProblem } from './hvco.ts'
import { type Issue, IssueCode, Severity, issue } from './issue.ts'
import type { Marking } from './marking.ts'
import { valuesOf } from './marking.ts'
import { triggeringValues } from './rule-match.ts'
import { checkWrittenRules } from './written-rules.ts'

/**
 * The values in a field that fire a rule.
 *
 * A rule names its trigger outright or as a regular expression. ODNI's
 * `util:containsAnyTokenMatching` calls XPath `matches()`, which is unanchored,
 * so `^RD-SG` fires on `RD-SG-14` and `RD-CNWDI` fires on itself. The patterns
 * carry their own anchors where they need them.
 */
/**
 * "If this field holds any of these tokens, that field must hold one of those."
 *
 * One shape covers both things the earlier implementation encoded by hand: which
 * classifications a control may accompany, and what a control requires beside
 * it. `SI` must be CONFIDENTIAL or above. `HCS` requires `NOFORN`. `OC-USGOV`
 * requires `OC`.
 */
const checkRequires = (marking: Marking, issues: Issue[]): void => {
  for (const rule of REQUIRES) {
    const present = triggeringValues(valuesOf(marking, rule.field), rule.tokens, rule.patterns)
    if (present.length === 0) {
      continue
    }

    const allowed: readonly string[] = rule.allowed
    if (valuesOf(marking, rule.requires).some((v) => allowed.includes(v))) {
      continue
    }

    issues.push(
      issue({
        code: IssueCode.Inconsistent,
        severity: Severity.Error,
        message:
          `${present.join(' and ')} in ${rule.field} requires ${rule.requires} to hold ` +
          `one of ${allowed.join(', ')}`,
        ruleId: rule.id,
        field: rule.requires,
      }),
    )
  }
}

/**
 * "If this field holds any of these tokens, that field must hold none of those."
 *
 * The inverse of `checkRequires`, and it has to be read as its own shape. The
 * token list inside a negated assert looks exactly like a requirement:
 * ISM-ID-00372 says `LES-NF` and `SBU-NF` cannot appear with another foreign
 * disclosure marking, and reading it the other way demanded one.
 */
const checkForbids = (marking: Marking, issues: Issue[]): void => {
  for (const rule of FORBIDS) {
    const present = triggeringValues(valuesOf(marking, rule.field), rule.tokens, rule.patterns)
    if (present.length === 0) {
      continue
    }

    const forbidden: readonly string[] = rule.forbidden
    const held = valuesOf(marking, rule.forbids).filter((v) => forbidden.includes(v))
    if (held.length === 0) {
      continue
    }

    issues.push(
      issue({
        code: IssueCode.Inconsistent,
        severity: Severity.Error,
        message:
          `${present.join(' and ')} in ${rule.field} does not permit ` +
          `${held.join(' or ')} in ${rule.forbids}`,
        ruleId: rule.id,
        field: rule.forbids,
      }),
    )
  }
}

/**
 * Whether a field may be there at all, decided by another field.
 *
 * `REL` requires a `releasableTo`, and no `REL` forbids one. ODNI states each
 * direction as its own rule, so both are reported under their own ISM-ID rather
 * than as one.
 */
const checkFieldPresence = (marking: Marking, issues: Issue[]): void => {
  for (const rule of FIELD_PRESENCE) {
    const tokens: readonly string[] = rule.tokens
    const held = valuesOf(marking, rule.field).filter((v) => tokens.includes(v))
    if (held.length > 0 !== rule.whenPresent) {
      continue
    }
    if (valuesOf(marking, rule.requires).length > 0 === rule.mustExist) {
      continue
    }

    const because = rule.whenPresent
      ? `${held.join(' and ')} in ${rule.field}`
      : `no ${tokens.join(' or ')} in ${rule.field}`
    issues.push(
      issue({
        code: IssueCode.Inconsistent,
        severity: Severity.Error,
        message: rule.mustExist
          ? `${because} requires ${rule.requires}`
          : `${because} does not permit ${rule.requires}`,
        ruleId: rule.id,
        field: rule.requires,
      }),
    )
  }
}

/** HVCO and its interpolated channel text form one representable value. */
const checkHvcoChannels = (marking: Marking, issues: Issue[]): void => {
  const channels = marking.handleViaChannels
  const problem = hvcoChannelProblem(marking.secondBannerLine, channels)
  if (problem !== undefined) {
    issues.push(
      issue({
        code: IssueCode.Inconsistent,
        severity: Severity.Error,
        message: problem,
        ...(channels === undefined ? {} : { token: channels }),
        field: 'handleViaChannels',
      }),
    )
  }
}

export const checkCrossField = (marking: Marking, issues: Issue[]): void => {
  checkRequires(marking, issues)
  checkForbids(marking, issues)
  checkFieldPresence(marking, issues)
  checkHvcoChannels(marking, issues)
  checkWrittenRules(marking, issues)
}
