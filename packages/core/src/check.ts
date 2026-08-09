/**
 * The boundary where text becomes a Marking.
 *
 * `read.ts` produces a `Draft`: the right shape, but every value is still text.
 * This checks each field against the vocabulary it draws from, and builds a
 * `MarkingInput` from what those checks returned. The result carries its types
 * because the values came back out of a register, not because anything asserted
 * they belonged there. See `admit.ts`.
 */
import {
  type Admits,
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
import type { NonEmpty } from './canonical.ts'
import type { Draft } from './draft.ts'
import { hvcoChannelProblem } from './hvco.ts'
import { type Issue, IssueCode, Severity, issue } from './issue.ts'
import type { MarkingInput } from './marking.ts'

/** ISM requires at least one owner-producer, which the type records. */
const isNonEmpty = <T>(values: readonly T[]): values is NonEmpty<T> => values.length > 0

/**
 * Checks every value in one field. Keeps the values the vocabulary admits and
 * reports the ones it does not. An absent field returns `undefined` and stays
 * absent: a field that is not there is not a field that is empty.
 */
const checkField = <T extends string>(
  values: readonly string[] | undefined,
  admits: Admits<T>,
  field: string,
  issues: Issue[],
): readonly T[] | undefined => {
  if (values === undefined) {
    return undefined
  }

  const checked: T[] = []
  for (const value of values) {
    const admitted = admits(value)
    if (admitted === undefined) {
      issues.push(
        issue({
          code: IssueCode.UnknownToken,
          severity: Severity.Error,
          message: `${value} is not a recognised ${field}`,
          token: value,
          field,
        }),
      )
    } else {
      checked.push(admitted)
    }
  }
  return checked
}

/** Every multi-valued field, checked against the vocabulary it draws from. */
const checkFields = (draft: Draft, issues: Issue[]) => ({
  SCIcontrols: checkField(draft.SCIcontrols, admitsSci, 'SCIcontrols', issues),
  atomicEnergyMarkings: checkField(
    draft.atomicEnergyMarkings,
    admitsAtomic,
    'atomicEnergyMarkings',
    issues,
  ),
  disseminationControls: checkField(
    draft.disseminationControls,
    admitsDissem,
    'disseminationControls',
    issues,
  ),
  releasableTo: checkField(draft.releasableTo, admitsRelTo, 'releasableTo', issues),
  displayOnlyTo: checkField(draft.displayOnlyTo, admitsRelTo, 'displayOnlyTo', issues),
  FGIsourceOpen: checkField(draft.FGIsourceOpen, admitsFgiOpen, 'FGIsourceOpen', issues),
  FGIsourceProtected: checkField(
    draft.FGIsourceProtected,
    admitsFgiProtected,
    'FGIsourceProtected',
    issues,
  ),
  nonICmarkings: checkField(draft.nonICmarkings, admitsNonIc, 'nonICmarkings', issues),
  nonUSControls: checkField(draft.nonUSControls, admitsNonUs, 'nonUSControls', issues),
  cuiBasic: checkField(draft.cuiBasic, admitsCuiBasic, 'cuiBasic', issues),
  cuiSpecified: checkField(draft.cuiSpecified, admitsCuiSpecified, 'cuiSpecified', issues),
  secondBannerLine: checkField(
    draft.secondBannerLine,
    admitsSecondBannerLine,
    'secondBannerLine',
    issues,
  ),
})

/**
 * Text to `MarkingInput`, with no assertion over the result.
 *
 * Every field is checked against the vocabulary it draws from, and the result is
 * built from what those checks returned, not from the draft. The values carry
 * their types because they came back out of a register. Optional fields are
 * spread in conditionally, because `exactOptionalPropertyTypes` separates an
 * absent key from a key holding `undefined`.
 *
 * Exported for the tests, which have the same problem with the harvested
 * vectors: JSON attributes are text, and text must be checked before it becomes
 * a Marking. Not re-exported from `index.ts`. `parse` and `createMarking` are
 * the public ways in.
 */
export const checkDraft = (draft: Draft, issues: Issue[]): MarkingInput | undefined => {
  const classification = admitsClassification(draft.classification ?? '')
  if (classification === undefined) {
    issues.push(
      issue({
        code: IssueCode.UnknownToken,
        severity: Severity.Error,
        message: `${draft.classification ?? ''} is not a recognised classification`,
        ...(draft.classification === undefined ? {} : { token: draft.classification }),
        field: 'classification',
      }),
    )
  }

  const owners = checkField(draft.ownerProducer, admitsOwnerProducer, 'ownerProducer', issues)
  const fields = checkFields(draft, issues)
  const hvcoProblem = hvcoChannelProblem(fields.secondBannerLine, draft.handleViaChannels)
  if (hvcoProblem !== undefined) {
    issues.push(
      issue({
        code: IssueCode.Malformed,
        severity: Severity.Error,
        message: hvcoProblem,
        ...(draft.handleViaChannels === undefined ? {} : { token: draft.handleViaChannels }),
        field: 'handleViaChannels',
      }),
    )
  }

  if (owners === undefined || !isNonEmpty(owners)) {
    issues.push(
      issue({
        code: IssueCode.Malformed,
        severity: Severity.Error,
        message: 'a Marking must name at least one owner-producer',
        field: 'ownerProducer',
      }),
    )
    return undefined
  }
  if (classification === undefined || issues.some((i) => i.severity === Severity.Error)) {
    return undefined
  }

  return {
    classification,
    ownerProducer: owners,
    ...(draft.joint !== undefined && { joint: draft.joint }),
    ...(fields.SCIcontrols !== undefined && { SCIcontrols: fields.SCIcontrols }),
    ...(fields.atomicEnergyMarkings !== undefined && {
      atomicEnergyMarkings: fields.atomicEnergyMarkings,
    }),
    ...(fields.disseminationControls !== undefined && {
      disseminationControls: fields.disseminationControls,
    }),
    ...(fields.releasableTo !== undefined && { releasableTo: fields.releasableTo }),
    ...(fields.displayOnlyTo !== undefined && { displayOnlyTo: fields.displayOnlyTo }),
    ...(fields.FGIsourceOpen !== undefined && { FGIsourceOpen: fields.FGIsourceOpen }),
    ...(fields.FGIsourceProtected !== undefined && {
      FGIsourceProtected: fields.FGIsourceProtected,
    }),
    ...(fields.nonICmarkings !== undefined && { nonICmarkings: fields.nonICmarkings }),
    ...(fields.nonUSControls !== undefined && { nonUSControls: fields.nonUSControls }),
    ...(fields.cuiBasic !== undefined && { cuiBasic: fields.cuiBasic }),
    ...(fields.cuiSpecified !== undefined && { cuiSpecified: fields.cuiSpecified }),
    ...(fields.secondBannerLine !== undefined && { secondBannerLine: fields.secondBannerLine }),
    ...(draft.handleViaChannels !== undefined && { handleViaChannels: draft.handleViaChannels }),
  }
}
