/**
 * Harvesting the bespoke rules that relate two fields.
 *
 * These have no abstract template. Each states a context — the condition that
 * fires the rule — and an assert, which is what must then be true. Three assert
 * shapes are read here, and `src/cross-field.ts` checks the tables they produce.
 *
 * A rule whose shape is not read is left out. That is the safe direction: an
 * absent rule reports nothing, and a misread one reports the opposite of the
 * truth. ISM-ID-00372 was misread for a time, which is why `FORBIDS_TEST` is
 * written out in full rather than found by a leading `not(`.
 */
import { type Rule, fieldOf, quotedList } from './schematron.ts'

/**
 * "If this field holds any of these tokens, that field must hold one of those."
 *
 * 29 bespoke rules have this shape. The XPath is read, not the prose, because
 * the XPath is exact:
 *
 *   context  *[$ISM_USGOV_RESOURCE and util:containsAnyOfTheTokens(@ism:SCIcontrols, ('SI'))]
 *   assert   util:containsAnyOfTheTokens(@ism:classification, ('TS', 'S', 'C'))
 */
const TOKEN_TEST = /util:containsAnyOfTheTokens\(\s*@ism:(\w+)\s*,\s*\(([^)]*)\)\s*\)/gu

/** The same test, by regular expression: `containsAnyTokenMatching(…, ('^SI-G$'))`. */
const PATTERN_TEST = /util:containsAnyTokenMatching\(\s*@ism:(\w+)\s*,\s*\(?([^)]*?)\)?\s*\)/gu

/**
 * Conditions that make a rule about a document instead of a Marking: identity
 * against the resource element, contribution to a Rollup, or a variable that
 * derives from `compliesWith`.
 *
 * `ISM_USGOV_RESOURCE` is not here. Every rule in this corpus carries it, and it
 * derives from `compliesWith`, which no Marking holds. The library reads it as
 * true throughout — see docs/risks.md — so it is a precondition rather than a
 * reason to skip.
 */
const DOCUMENT_SCOPED = /generate-id|contributesToRollup|resourceElement|USDOD|USCUI/u

/**
 * The second assert form: an equality rather than a token test. Both a single
 * value and a sequence appear — `@ism:classification='U'` and
 * `@ism:classification=('TS', 'S', 'C')` — and they mean the same thing.
 */
const EQUALITY_TEST = /^@ism:(\w+)\s*=\s*(\([^)]*\)|'[^']+')$/u

/** The assert is the bare presence of a field, or its absence. */
const PRESENCE_TEST = /^(not\()?\s*@ism:(\w+)\s*\)?$/u

/**
 * The assert forbids tokens rather than requiring them.
 *
 * Written out in full rather than by looking for a leading `not(`, because the
 * token list inside it reads exactly like a requirement. ISM-ID-00372 was
 * harvested that way and inverted: the rule says `LES-NF` and `SBU-NF` must
 * **not** appear with `NF`, `REL`, `EYES`, `RELIDO` or `DISPLAYONLY`, and it was
 * reported as requiring one of them.
 */
const FORBIDS_TEST =
  /^not\(\s*util:containsAnyOfTheTokens\(\s*@ism:(\w+)\s*,\s*\(([^)]*)\)\s*\)\s*\)$/u

/**
 * A trigger the context negates: `not(containsAnyOfTheTokens(…))`.
 *
 * Tested on the text immediately before the trigger, which is where the `not(`
 * sits. ISM-ID-00032 is the reason this matters: it says that *without* `REL` or
 * `EYES` there must be no `releasableTo`. Read as a positive trigger it would
 * say the opposite, and would fire on every releasable marking.
 */
const negated = (context: string, at: number): boolean => /not\(\s*$/u.test(context.slice(0, at))

export type RequiresRow = {
  id: string
  field: string
  tokens: string[]
  patterns: string[]
  requires: string
  allowed: string[]
}

export type PresenceRow = {
  id: string
  field: string
  tokens: string[]
  /** Whether the rule fires when the trigger tokens are present or absent. */
  whenPresent: boolean
  requires: string
  /** Whether `requires` must then be present or absent. */
  mustExist: boolean
}

export type ForbidsRow = {
  id: string
  field: string
  tokens: string[]
  patterns: string[]
  forbids: string
  forbidden: string[]
}

export type CrossField = {
  requires: RequiresRow[]
  presence: PresenceRow[]
  forbids: ForbidsRow[]
}

type Trigger = {
  field: string
  tokens: string[]
  patterns: string[]
  /** Whether the rule fires when those tokens are present or absent. */
  whenPresent: boolean
}

/**
 * The one field condition a rule's context states, or nothing.
 *
 * A trigger names its tokens outright or by regular expression. The two are
 * otherwise the same shape, so they are read together and split here: a literal
 * list can be compared, a pattern has to be matched.
 *
 * A second `@ism:` in the context is a condition the trigger does not hold, so
 * the rule is left alone. ISM-ID-00363 also tests that SCIcontrols is absent,
 * and ISM-ID-00319 tests two fields at once.
 */
const triggerOf = (context: string): Trigger | undefined => {
  if ((context.match(/@ism:/gu) ?? []).length !== 1) {
    return undefined
  }

  const literal = [...context.matchAll(TOKEN_TEST)]
  const pattern = [...context.matchAll(PATTERN_TEST)]
  const trigger = literal[0] ?? pattern[0]
  if (literal.length + pattern.length !== 1 || trigger === undefined) {
    return undefined
  }

  const field = fieldOf(`@ism:${trigger[1] ?? ''}`)
  if (field === undefined) {
    return undefined
  }

  const values = quotedList(trigger[2] ?? '')
  return {
    field,
    tokens: literal.length === 1 ? values : [],
    patterns: pattern.length === 1 ? values : [],
    whenPresent: !negated(context, trigger.index),
  }
}

/**
 * The assert is the bare presence of a field: `REL` requires a `releasableTo`,
 * and no `REL` forbids one.
 */
const presenceRowOf = (id: string, t: Trigger, assertion: string): PresenceRow | undefined => {
  const exists = PRESENCE_TEST.exec(assertion)
  const requires = fieldOf(`@ism:${exists?.[2] ?? ''}`)
  if (exists === null || requires === undefined || t.patterns.length > 0) {
    return undefined
  }
  return {
    id,
    field: t.field,
    tokens: t.tokens,
    whenPresent: t.whenPresent,
    requires,
    mustExist: exists[1] === undefined,
  }
}

/**
 * A negated assert forbids its tokens. Read as a requirement it would demand
 * exactly what the rule rules out.
 */
const forbidsRowOf = (id: string, t: Trigger, assertion: string): ForbidsRow | undefined => {
  const forbidden = FORBIDS_TEST.exec(assertion)
  const field = fieldOf(`@ism:${forbidden?.[1] ?? ''}`)
  if (forbidden === null || field === undefined || !t.whenPresent) {
    return undefined
  }
  return {
    id,
    field: t.field,
    tokens: t.tokens,
    patterns: t.patterns,
    forbids: field,
    forbidden: quotedList(forbidden[2] ?? ''),
  }
}

/**
 * Two assert forms say the same thing: a token test, and a direct equality
 * against one value or a sequence of them. ISM-ID-00030 uses the second form to
 * say that `FOUO` requires `classification='U'`.
 *
 * Anything negated is left out. That is the safe direction: a rule that is
 * absent reports nothing, and a rule that is inverted reports the opposite of
 * the truth.
 */
const requiresRowOf = (id: string, t: Trigger, assertion: string): RequiresRow | undefined => {
  if (assertion.startsWith('not(') || !t.whenPresent) {
    return undefined
  }
  const equality = EQUALITY_TEST.exec(assertion)
  const required = [...assertion.matchAll(TOKEN_TEST)]
  const requires = fieldOf(`@ism:${equality?.[1] ?? required[0]?.[1] ?? ''}`)
  if ((equality === null && required.length !== 1) || requires === undefined) {
    return undefined
  }
  return {
    id,
    field: t.field,
    tokens: t.tokens,
    patterns: t.patterns,
    requires,
    allowed: quotedList(equality?.[2] ?? required[0]?.[2] ?? ''),
  }
}

export const harvestCrossField = (rules: readonly Rule[]): CrossField => {
  const out: CrossField = { requires: [], presence: [], forbids: [] }

  for (const rule of rules) {
    const context = rule.raw.context ?? ''
    const assertion = (rule.raw.assert ?? '').trim()
    if (rule.template !== '' || DOCUMENT_SCOPED.test(`${context} ${assertion}`)) {
      continue
    }
    const trigger = triggerOf(context)
    if (trigger === undefined) {
      continue
    }

    // One assert is one shape. Order matters only in that a bare presence test
    // and a negated token test both start with `not(`.
    const presence = presenceRowOf(rule.id, trigger, assertion)
    const forbids = presence === undefined ? forbidsRowOf(rule.id, trigger, assertion) : undefined
    const requires =
      presence === undefined && forbids === undefined
        ? requiresRowOf(rule.id, trigger, assertion)
        : undefined

    if (presence !== undefined) {
      out.presence.push(presence)
    }
    if (forbids !== undefined) {
      out.forbids.push(forbids)
    }
    if (requires !== undefined) {
      out.requires.push(requires)
    }
  }

  return out
}
