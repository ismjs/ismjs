/**
 * Turning one `//`-delimited segment of a marking into draft fields.
 *
 * A segment carries no label. `S//SI//NF` does not say which part is an SCI
 * control and which is a dissemination control. Each segment is identified by
 * what it holds, matching whole tokens against the generated vocabularies.
 * Nothing is read character by character: that is how `OC` took the front of
 * `OC-USGOV` in the 2018 implementation.
 *
 * These readers write text, not tokens. `parse` checks what they wrote against
 * the vocabularies before any of it becomes a Marking.
 */
import { FGI_MARKER } from './generated/ismcat.ts'
import {
  ATOMIC_ENERGY_MARKING_TOKENS,
  NON_IC_MARKING_TOKENS,
  SCI_CONTROL_TOKENS,
  SECOND_BANNER_LINE_DESCRIPTIONS,
  US_CLASSIFICATION_TOKENS,
} from './generated/vocab.ts'
import { readDissem, looksLikeDissem } from './dissem.ts'
import type { Draft } from './draft.ts'
import { rejoinEntities } from './entity-spelling.ts'
import { expandAtomicEnergy, expandCompartmented } from './expand.ts'
import { type Issue, IssueCode, Severity, issue } from './issue.ts'
import { NON_US_BY_BARE, SECOND_LINE_TOKENS, unbannerAtomic, unspell } from './spelling.ts'
import { ACCM_PREFIX, CUI, CUI_SPECIFIED_PREFIX, HANDLE_VIA, ITEM, JOINT, WORD } from './syntax.ts'
import { HVCO, USA } from './tokens.ts'

// ---------------------------------------------------------------------------

const inVocabulary = (vocabulary: readonly string[]): ((token: string) => boolean) => {
  const known = new Set<string>(vocabulary)
  return (token) => known.has(token)
}

const isClassification = inVocabulary(US_CLASSIFICATION_TOKENS)
const isSci = inVocabulary(SCI_CONTROL_TOKENS)
const isAtomic = inVocabulary(ATOMIC_ENERGY_MARKING_TOKENS)
const isNonIc = inVocabulary(NON_IC_MARKING_TOKENS)

// ---------------------------------------------------------------------------

export const readClassification = (head: string, draft: Draft, issues: Issue[]): void => {
  // `//JOINT S DEU USA`, `//DEU GBR S`, `//GBR S`, or a bare `S`.
  const words = head.split(WORD)

  // A joint marking names its classification first and its owners after, but a
  // Banner Line spells `TS` as two words. Find the boundary by taking the
  // shortest leading run that reads as a classification, not a fixed number of
  // words.
  if (words[0] === JOINT) {
    draft.joint = true
    const rest = words.slice(1)
    for (let take = 1; take <= rest.length; take += 1) {
      const candidate = unspell(rest.slice(0, take).join(WORD))
      if (isClassification(candidate)) {
        draft.classification = candidate
        draft.ownerProducer = rejoinEntities(rest.slice(take))
        return
      }
    }
    issues.push(
      issue({
        code: IssueCode.Malformed,
        severity: Severity.Error,
        message: `cannot read a classification from ${head}`,
      }),
    )
    return
  }

  // `TOP SECRET` is one classification in two words, not an owner and a
  // classification. Try the whole head before you read any of it as ownership.
  const whole = unspell(head)
  if (isClassification(whole)) {
    draft.classification = whole
    draft.ownerProducer = [USA]
    return
  }

  // Foreign ownership puts the owners first and the classification last. A
  // spelled-out classification is itself several words.
  for (let split = 1; split < words.length; split += 1) {
    const candidate = unspell(words.slice(split).join(WORD))
    if (isClassification(candidate)) {
      draft.classification = candidate
      draft.ownerProducer = rejoinEntities(words.slice(0, split))
      return
    }
  }

  issues.push(
    issue({
      code: IssueCode.Malformed,
      severity: Severity.Error,
      message: `cannot read a classification from ${head}`,
    }),
  )
}

// ---------------------------------------------------------------------------

/** Re-attaches the `ACCM-` qualifier and the underscores its name renders without. */
const restoreAccm = (entries: readonly string[]): readonly string[] => {
  const firstAccm = entries.findIndex((e) => e.startsWith(ACCM_PREFIX))
  if (firstAccm === -1) {
    return entries.map((e) => unspell(e))
  }
  return entries.map((entry, index) => {
    if (index < firstAccm) {
      return unspell(entry)
    }
    if (entry.startsWith(ACCM_PREFIX)) {
      return `${ACCM_PREFIX}${entry.slice(ACCM_PREFIX.length).replaceAll(WORD, '_')}`
    }
    // A registered non-IC marking ends the ACCM run. It does not continue it.
    return isNonIc(unspell(entry)) ? unspell(entry) : `${ACCM_PREFIX}${entry.replaceAll(WORD, '_')}`
  })
}

const liftNonUsControls = (segment: string, draft: Draft): string => {
  const entries = segment.split(ITEM)
  const carried = entries.filter((e) => NON_US_BY_BARE[e] !== undefined)
  if (carried.length === 0) {
    return segment
  }

  draft.nonUSControls = [
    ...(draft.nonUSControls ?? []),
    ...carried.flatMap((e) => {
      const control = NON_US_BY_BARE[e]
      return control === undefined ? [] : [control]
    }),
  ]

  return entries.filter((e) => NON_US_BY_BARE[e] === undefined).join(ITEM)
}

// ---------------------------------------------------------------------------

/**
 * What an earlier segment established about the one coming next.
 *
 * Only the CUI marker so far, and it does real work. CUI categories cannot be
 * identified by their content: `DCNI` is also an atomic energy marking, `SSI` is
 * a non-IC marking, and `PROPIN` is how a Banner Line spells the dissemination
 * control `PR`. Position identifies them. The categories are the segment after
 * the `CUI` marker, and `format` always emits that marker first.
 */
export type ReadState = { cuiNext: boolean }

const readCuiCategories = (segment: string, draft: Draft): void => {
  const entries = segment.split(ITEM)
  const specified = entries
    .filter((e) => e.startsWith(CUI_SPECIFIED_PREFIX))
    .map((e) => e.slice(CUI_SPECIFIED_PREFIX.length))
  const basic = entries.filter((e) => !e.startsWith(CUI_SPECIFIED_PREFIX))

  if (specified.length > 0) {
    draft.cuiSpecified = specified
  }
  if (basic.length > 0) {
    draft.cuiBasic = basic
  }
}

/**
 * Segments recognised by their own wording rather than by their vocabulary: the
 * empty run, the bare `CUI` marker, and the two FGI forms.
 */
const readFixedSegment = (segment: string, draft: Draft, state: ReadState): boolean => {
  if (segment === CUI) {
    state.cuiNext = true
    return true
  }
  if (segment === '') {
    return true
  }
  if (segment === FGI_MARKER) {
    draft.FGIsourceProtected = [FGI_MARKER]
    return true
  }
  if (segment.startsWith(`${FGI_MARKER}${WORD}`)) {
    draft.FGIsourceOpen = rejoinEntities(segment.slice(FGI_MARKER.length + 1).split(WORD))
    return true
  }
  return false
}

/** Classify one `//`-delimited segment and fold it into the draft Marking. */
export const readSegment = (
  segment: string,
  draft: Draft,
  state: ReadState,
  issues: Issue[],
): void => {
  if (state.cuiNext) {
    state.cuiNext = false
    readCuiCategories(segment, draft)
    return
  }
  if (readFixedSegment(segment, draft, state)) {
    return
  }

  const remaining = liftNonUsControls(segment, draft)
  if (remaining === '') {
    return
  }

  const entries = remaining.split(ITEM)
  // A banner spells `UCNI` as `DOE UCNI`, so try the whole entry before
  // falling back to its leading word.
  const leadEntry = entries[0] ?? ''
  const lead = isAtomic(unspell(leadEntry))
    ? unspell(leadEntry)
    : (leadEntry.split(/[- ]/u)[0] ?? '')

  // Order matters: the compartmented segments are identified by their leading
  // control, which is unambiguous, before the looser content-based tests.
  if (isSci(lead)) {
    draft.SCIcontrols = expandCompartmented(remaining)
    return
  }
  if (isAtomic(lead)) {
    draft.atomicEnergyMarkings = expandAtomicEnergy(unbannerAtomic(remaining))
    return
  }
  if (looksLikeDissem(remaining)) {
    readDissem(remaining, draft)
    return
  }
  // Only the first ACCM entry carries the qualifier, so a segment counts as
  // non-IC if any entry is one; the rest are its unprefixed continuations.
  if (entries.some((e) => e.startsWith(ACCM_PREFIX)) || entries.every((e) => isNonIc(unspell(e)))) {
    draft.nonICmarkings = restoreAccm(entries)
    return
  }

  issues.push(
    issue({
      code: IssueCode.UnknownToken,
      severity: Severity.Error,
      message: `unrecognised segment ${segment}`,
      token: segment,
    }),
  )
}

/** `HANDLE VIA … CHANNELS ONLY` carries its channels inside its own description. */
export const readSecondBannerLine = (secondLine: string, draft: Draft): void => {
  const head = HANDLE_VIA
  const tail = SECOND_BANNER_LINE_DESCRIPTIONS[HVCO].slice(HANDLE_VIA.length)

  draft.secondBannerLine = secondLine.split(ITEM).map((text) => {
    if (text.startsWith(head) && text.endsWith(tail)) {
      draft.handleViaChannels = text.slice(head.length, text.length - tail.length).trim()
      return HVCO
    }
    return SECOND_LINE_TOKENS[text] ?? text
  })
}
