/**
 * Reading a Banner Line or Portion Mark back into a Marking.
 *
 * This file assembles. It strips the wrapper, splits on `//`, gives each segment
 * to `read.ts`, and checks what comes back before any of it becomes a Marking.
 * The draft in between holds plain text, so the one conversion at the end is
 * earned by the check instead of asserted over it.
 */
import type { Canonical } from './canonical.ts'
import { checkDraft } from './check.ts'
import type { Draft } from './draft.ts'
import { type Issue, type ParseResult, IssueCode, Severity, issue } from './issue.ts'
import type { Marking, MarkingInput } from './marking.ts'
import { canonicalize } from './normalize.ts'
import { type ReadState, readClassification, readSecondBannerLine, readSegment } from './read.ts'
import { orderNonIcForRendering, orderNonUsForRendering } from './render-order.ts'
import { CUI, PORTION_CLOSE, PORTION_OPEN, SECOND_LINE, SEGMENT } from './syntax.ts'
import { UNCLASSIFIED, USA } from './tokens.ts'

export type ParseOptions = {
  /**
   * Whether input that is merely out of its required order is an error. Default.
   * Most fields require Canonical Order; fields whose string syntax differs use
   * Presentation Order. With `strict: false`, either is repaired and reported
   * as a warning instead.
   */
  readonly strict?: boolean
}

// ---------------------------------------------------------------------------

/**
 * Canonical Order and Presentation Order are preconditions, not preferences.
 * Input that arrives out of its field's required order is reported, not repaired
 * without notice. Returns whether every field was in its required order.
 */
const ORDERED_FIELDS = [
  'ownerProducer',
  'SCIcontrols',
  'atomicEnergyMarkings',
  'disseminationControls',
  'releasableTo',
  'displayOnlyTo',
  'FGIsourceOpen',
  'FGIsourceProtected',
  'nonICmarkings',
  'nonUSControls',
  'cuiBasic',
  'cuiSpecified',
  'secondBannerLine',
] as const satisfies readonly (keyof Marking)[]

const sameValues = (
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean =>
  left === undefined
    ? right === undefined
    : right !== undefined &&
      left.length === right.length &&
      left.every((value, index) => value === right[index])

type RequiredOrder = 'Canonical Order' | 'Presentation Order'

/** Presentation Order follows string syntax where it differs from Canonical Order. */
const expectedValues = (
  field: (typeof ORDERED_FIELDS)[number],
  marking: Marking,
): readonly [readonly string[] | undefined, RequiredOrder] => {
  const values = marking[field]
  if (field === 'nonICmarkings' && values !== undefined) {
    return [orderNonIcForRendering(values), 'Presentation Order']
  }
  if (field === 'nonUSControls' && values !== undefined) {
    const stringValues: readonly string[] = values
    return [orderNonUsForRendering(stringValues), 'Presentation Order']
  }
  return [values, 'Canonical Order']
}

const reportOrder = (
  supplied: MarkingInput,
  canonical: Marking,
  strict: boolean,
  issues: Issue[],
): boolean => {
  let reported = false
  for (const field of ORDERED_FIELDS) {
    const before = supplied[field]
    const [after, order] = expectedValues(field, canonical)
    if (typeof before === 'string' || typeof after === 'string' || sameValues(before, after)) {
      continue
    }
    reported = true
    issues.push(
      issue({
        code: IssueCode.NotCanonical,
        severity: strict ? Severity.Error : Severity.Warning,
        message: `${field} is not in ${order} or contains duplicates`,
        field,
      }),
    )
  }
  return reported
}

/** Strips the Portion Mark wrapper and splits off any second Banner Line. */
const unwrap = (input: string): { body: string; secondLine: string; malformed: boolean } => {
  let body = input

  if (body.startsWith(PORTION_OPEN)) {
    if (!body.endsWith(PORTION_CLOSE)) {
      return { body: '', secondLine: '', malformed: true }
    }
    body = body.slice(PORTION_OPEN.length, -PORTION_CLOSE.length)
  }

  const pipe = body.indexOf(SECOND_LINE)
  return pipe === -1
    ? { body, secondLine: '', malformed: false }
    : { body: body.slice(0, pipe), secondLine: body.slice(pipe + 1), malformed: false }
}

/** Reads the whole marking string into a draft, without checking any of it. */
const readDraft = (body: string, secondLine: string, issues: Issue[]): Draft => {
  const draft: Draft = {}
  const all = body.split(SEGMENT)
  // Foreign and joint ownership start with `//`. That leaves the first segment
  // empty and puts the classification in the second.
  const segments = all[0] === '' ? all.slice(1) : all
  if (segments.some((segment) => segment === '')) {
    issues.push(
      issue({
        code: IssueCode.Malformed,
        severity: Severity.Error,
        message: 'a marking cannot contain an empty segment',
      }),
    )
    return draft
  }
  const head = segments[0] ?? ''

  // A pure CUI Marking leads with `CUI` in place of a classification.
  const state: ReadState = { cuiNext: head === CUI }
  if (state.cuiNext) {
    draft.classification = UNCLASSIFIED
    draft.ownerProducer = [USA]
  } else {
    readClassification(head, draft, issues)
  }

  for (const segment of segments.slice(1)) {
    readSegment(segment, draft, state, issues)
  }

  if (state.cuiNext) {
    issues.push(
      issue({
        code: IssueCode.Malformed,
        severity: Severity.Error,
        message: 'a CUI marker must be followed by a category segment',
        token: CUI,
        field: 'cuiBasic',
      }),
    )
  }

  if (secondLine !== '') {
    readSecondBannerLine(secondLine, draft)
  }

  return draft
}

/**
 * Read a Marking from its rendered form.
 *
 * Failure is a return value, not an exception. Unreadable input is expected for
 * a codec and carries the same Issue shape that validation uses.
 */
export const parse = (input: string, options: ParseOptions = {}): ParseResult => {
  const strict = options.strict ?? true
  const issues: Issue[] = []

  const { body, secondLine, malformed } = unwrap(input)
  if (malformed) {
    return {
      ok: false,
      issues: [
        issue({
          code: IssueCode.Malformed,
          severity: Severity.Error,
          message: 'unbalanced portion mark',
        }),
      ],
    }
  }

  const draft = readDraft(body, secondLine, issues)
  if (issues.some((i) => i.severity === Severity.Error)) {
    return { ok: false, issues }
  }

  const checked = checkDraft(draft, issues)
  if (checked === undefined) {
    return { ok: false, issues }
  }

  const marking = canonicalize(checked)

  if (reportOrder(checked, marking, strict, issues) && strict) {
    return { ok: false, issues }
  }

  return { ok: true, marking, issues }
}

export type { Marking, Canonical }
