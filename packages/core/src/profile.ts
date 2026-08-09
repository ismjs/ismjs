/**
 * Restricting a deployment to the markings it is allowed to issue.
 *
 * An application on a SECRET network must not offer `MVL`, which requires TOP
 * SECRET. The earlier implementation shipped a separate build for each enclave.
 * That was necessary then, because source holding the string `TOP SECRET` could
 * not pass a cross-domain gate on its way down. This library starts unclassified
 * and only moves up, so a profile is a value and not a build.
 *
 * **A profile is not a security control.** It is a client-side allowlist. It
 * shapes what a UI offers and what `validate` accepts, and any caller can ignore
 * it by not passing it. The network keeps the enclaves apart, not this file.
 *
 * Most of a profile is derived. `profileFor` reads the cross-field rules — `SI`
 * requires CONFIDENTIAL or above, `MVL` requires TOP SECRET — and works out
 * which tokens a ceiling leaves reachable. It cannot derive local policy. The
 * specification does not say which compartments a site is accredited for, so
 * those are written by hand.
 */
import { REQUIRES } from './generated/rules.ts'
import type { MEMBERSHIP } from './generated/rules.ts'
import { US_CLASSIFICATION_TOKENS } from './generated/vocab.ts'
import type { UsClassification } from './generated/vocab.ts'
import { type Issue, IssueCode, Severity, issue } from './issue.ts'
import type { Marking } from './marking.ts'
import { valuesOf } from './marking.ts'
import { matchesRuleTrigger } from './rule-match.ts'

/** Any field drawn from a register, which is every field worth restricting. */
export type ProfileField = keyof typeof MEMBERSHIP

/**
 * One field's restriction, as one thing or the other, not as a convention.
 *
 * Both directions are needed, and they suit different jobs. A ceiling rules out
 * a few tokens and leaves hundreds in. A site that names the three compartments
 * it is accredited for wants the opposite. Optional pattern lists apply in the
 * same direction as their literal list, so existing explicit profiles remain
 * valid while free-form Compartment expressions can be represented.
 */
export type Restriction =
  | { readonly allow: readonly string[]; readonly allowPatterns?: readonly string[] }
  | { readonly deny: readonly string[]; readonly denyPatterns?: readonly string[] }

/**
 * Which values this deployment may issue, per field. An absent field is
 * unrestricted — a profile narrows, it does not enumerate.
 */
export type Profile = { readonly [F in ProfileField]?: Restriction }

/**
 * Classifications no higher than the ceiling.
 *
 * `US_CLASSIFICATION_TOKENS` is the CVE's own order, most sensitive first, so
 * everything from the ceiling onward is at or below it. A test pins that,
 * because this idea depends on the register being ordered.
 */
export const atOrBelow = (ceiling: UsClassification): readonly UsClassification[] => {
  const from = US_CLASSIFICATION_TOKENS.indexOf(ceiling)
  return from === -1 ? [] : US_CLASSIFICATION_TOKENS.slice(from)
}

/**
 * The profile a classification ceiling implies.
 *
 * A token is out of reach when every classification its rules permit is above
 * the ceiling. `MVL` requires TOP SECRET, so a SECRET deployment can never issue
 * it legally. A token that no rule constrains stays available: `NOFORN` on an
 * UNCLASSIFIED marking is ordinary, whatever a builder UI chooses to show.
 */
export const profileFor = (ceiling: UsClassification): Profile => {
  const reachable = new Set<string>(atOrBelow(ceiling))
  const barred = new Map<string, { tokens: Set<string>; patterns: Set<string> }>()

  for (const rule of REQUIRES) {
    if (rule.requires !== 'classification') {
      continue
    }
    const allowed: readonly string[] = rule.allowed
    if (allowed.some((c) => reachable.has(c))) {
      continue
    }
    const forField = barred.get(rule.field) ?? {
      tokens: new Set<string>(),
      patterns: new Set<string>(),
    }
    for (const token of rule.tokens) {
      forField.tokens.add(token)
    }
    for (const pattern of rule.patterns) {
      forField.patterns.add(pattern)
    }
    barred.set(rule.field, forField)
  }

  const profile: Record<string, Restriction> = {
    classification: { allow: [...reachable] },
  }
  for (const [field, restriction] of barred) {
    profile[field] = {
      deny: [...restriction.tokens],
      ...(restriction.patterns.size > 0 && { denyPatterns: [...restriction.patterns] }),
    }
  }
  return profile as Profile
}

const permitsValue = (restriction: Restriction, value: string): boolean =>
  'allow' in restriction
    ? matchesRuleTrigger(value, restriction.allow, restriction.allowPatterns ?? [])
    : !matchesRuleTrigger(value, restriction.deny, restriction.denyPatterns ?? [])

/** Values this deployment may not issue, as issues. */
export const checkProfile = (marking: Marking, profile: Profile, issues: Issue[]): void => {
  for (const [field, restriction] of Object.entries(profile)) {
    if (restriction === undefined) {
      continue
    }
    for (const value of valuesOf(marking, field as keyof Marking)) {
      if (permitsValue(restriction, value)) {
        continue
      }
      issues.push(
        issue({
          code: IssueCode.OutsideProfile,
          severity: Severity.Error,
          // No `ruleId`: this is local policy, not a rule ODNI publishes.
          message: `${value} is not permitted in ${field} by this profile`,
          field,
          token: value,
        }),
      )
    }
  }
}
