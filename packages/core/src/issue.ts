/**
 * What `parse` and `validate` report.
 *
 * Failure is a return value, not an exception. Unreadable input is an expected
 * result for a codec.
 *
 * A successful parse can still carry non-fatal issues such as a repaired order.
 * A deprecated token also remains readable: `validate`, given the resource date,
 * reports its retirement instead of making historical documents unparseable.
 */
import type { Marking } from './marking.ts'

export const Severity = {
  Error: 'error',
  Warning: 'warning',
} as const

export type Severity = (typeof Severity)[keyof typeof Severity]

export const IssueCode = {
  /** Unbalanced parentheses, an empty segment, a stray separator. */
  Malformed: 'malformed',
  /** A token no vocabulary holds. Fatal even in lenient mode: to admit it would
   *  put a value in a Marking that its own type forbids. */
  UnknownToken: 'unknown-token',
  /** Correct tokens in the wrong segment. */
  WrongSegment: 'wrong-segment',
  /** Correct tokens outside the field's required Canonical or Presentation Order.
   *  The one code whose severity follows the mode. */
  NotCanonical: 'not-canonical',
  /** Still readable, but retired from the register; severity depends on the resource date. */
  Deprecated: 'deprecated',
  /** Two tokens the register says cannot appear together. */
  MutuallyExclusive: 'mutually-exclusive',
  /** Two fields that disagree. Each is legal alone, but not together. */
  Inconsistent: 'inconsistent',
  /**
   * Legal ISM, but outside what this deployment may issue. Carries no `ruleId`:
   * a profile is local policy rather than a rule ODNI publishes.
   */
  OutsideProfile: 'outside-profile',
} as const

export type IssueCode = (typeof IssueCode)[keyof typeof IssueCode]

export type Issue = {
  readonly code: IssueCode
  readonly severity: Severity
  readonly message: string
  /** The offending value, where there is a single one. */
  readonly token?: string
  /** The Marking field concerned, where the issue belongs to one. */
  readonly field?: string
  /** The official rule identifier, when the issue comes from the rule corpus. */
  readonly ruleId?: string
}

/**
 * `ok` means the string could be **read**, not that the marking is **legal**.
 *
 * A marking on a real document can parse correctly and still break many rules.
 * To find that is one of the reasons for this library. Give the string to
 * `validate` for the second question.
 */
export type ParseResult =
  | { readonly ok: true; readonly marking: Marking; readonly issues: readonly Issue[] }
  | { readonly ok: false; readonly issues: readonly Issue[] }

/** Build an Issue from named metadata so same-typed fields cannot transpose. */
export const issue = ({ code, severity, message, token, field, ruleId }: Issue): Issue => ({
  code,
  severity,
  message,
  ...(token === undefined ? {} : { token }),
  ...(field === undefined ? {} : { field }),
  ...(ruleId === undefined ? {} : { ruleId }),
})
