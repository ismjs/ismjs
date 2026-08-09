/**
 * Turning checked text into typed vocabulary values, without an assertion.
 *
 * Nothing here claims that a string is a token. There are two ways to avoid it.
 *
 * The token comes back out of the vocabulary that holds it: a `Map<string, T>`
 * lookup returns `T | undefined` by itself. Or, where the term is a pattern and
 * not a literal, the value is rebuilt from its parts, and the template literal
 * type follows from that construction:
 *
 *   `${control}-${rest}`  is  `${SciControl}-${string}`
 *
 * Both give the type checker a reason to accept the result. An assertion does
 * not. A rebuilt value is character for character the value that was tested,
 * because the parts it is built from are slices of that value.
 */
import { CUI_BASIC_TOKENS, CUI_SPECIFIED_TOKENS } from './generated/cui.ts'
import type { CuiBasic, CuiSpecified } from './generated/cui.ts'
import {
  FGI_OPEN_ENTITY_TOKENS,
  FGI_PROTECTED_ENTITY_TOKENS,
  OWNER_PRODUCER_TOKENS,
  REL_TO_ENTITY_TOKENS,
} from './generated/ismcat.ts'
import type { FgiOpenEntity, FgiProtectedEntity, OwnerProducer } from './generated/ismcat.ts'
import {
  ATOMIC_ENERGY_MARKING_TOKENS,
  DISSEM_CONTROL_TOKENS,
  NON_IC_MARKING_TOKENS,
  NON_US_CONTROL_TOKENS,
  SCI_CONTROL_TOKENS,
  SECOND_BANNER_LINE_TOKENS,
  US_CLASSIFICATION_TOKENS,
} from './generated/vocab.ts'
import type {
  AtomicEnergyMarking,
  DissemControl,
  NonIcMarking,
  NonUsControl,
  SciControl,
  SecondBannerLine,
  UsClassification,
} from './generated/vocab.ts'
import { stemOf } from './canonical.ts'
import type {
  FgiOpenExpression,
  FgiProtectedExpression,
  NatoSubOrganisation,
  NonIcExpression,
  RelToExpression,
  SciExpression,
} from './marking.ts'
import { ACCM_PREFIX, COMPARTMENT, NON_US_QUALIFIER } from './syntax.ts'
import { NATO_PREFIX } from './tokens.ts'

/** Draws a value back out of the vocabulary that admits it, or rejects it. */
export type Admits<T extends string> = (value: string) => T | undefined

/**
 * The lookup that does the work. A `Map<string, T>` built from `readonly T[]`
 * returns a `T`, so retrieval establishes membership.
 */
const oneOf = <T extends string>(tokens: readonly T[]): Admits<T> => {
  const known = new Map(tokens.map((token): readonly [string, T] => [token, token]))
  return (value) => known.get(value)
}

/** Widens an admitter to also accept the NATO sub-organisation pattern term. */
const orSubOrganisation =
  <T extends string>(admits: Admits<T>): Admits<T | NatoSubOrganisation> =>
  (value) => {
    const known = admits(value)
    if (known !== undefined) {
      return known
    }
    return value.startsWith(NATO_PREFIX)
      ? `${NATO_PREFIX}${value.slice(NATO_PREFIX.length)}`
      : undefined
  }

export const admitsClassification: Admits<UsClassification> = oneOf(US_CLASSIFICATION_TOKENS)
export const admitsOwnerProducer: Admits<OwnerProducer> = oneOf(OWNER_PRODUCER_TOKENS)
export const admitsAtomic: Admits<AtomicEnergyMarking> = oneOf(ATOMIC_ENERGY_MARKING_TOKENS)
export const admitsDissem: Admits<DissemControl> = oneOf(DISSEM_CONTROL_TOKENS)
export const admitsCuiBasic: Admits<CuiBasic> = oneOf(CUI_BASIC_TOKENS)
export const admitsCuiSpecified: Admits<CuiSpecified> = oneOf(CUI_SPECIFIED_TOKENS)
export const admitsSecondBannerLine: Admits<SecondBannerLine> = oneOf(SECOND_BANNER_LINE_TOKENS)

export const admitsRelTo: Admits<RelToExpression> = orSubOrganisation(oneOf(REL_TO_ENTITY_TOKENS))
export const admitsFgiOpen: Admits<FgiOpenExpression> = orSubOrganisation(
  oneOf<FgiOpenEntity>(FGI_OPEN_ENTITY_TOKENS),
)
export const admitsFgiProtected: Admits<FgiProtectedExpression> = orSubOrganisation(
  oneOf<FgiProtectedEntity>(FGI_PROTECTED_ENTITY_TOKENS),
)

const registeredNonUs: Admits<NonUsControl> = oneOf(NON_US_CONTROL_TOKENS)

/**
 * Documents write a non-US control bare, as `ATOMAL`, where the register
 * qualifies it as `NATO-ATOMAL`. The reference matches the bare name too, in
 * `contains($nonUSControls, 'ATOMAL')`. Both forms are admitted here, and both
 * come back in the registered form.
 */
export const admitsNonUs: Admits<NonUsControl> = (value) =>
  registeredNonUs(value) ?? registeredNonUs(`${NON_US_QUALIFIER}${value}`)

const registeredNonIc: Admits<NonIcMarking> = oneOf(NON_IC_MARKING_TOKENS)

export const admitsNonIc: Admits<NonIcExpression> = (value) => {
  const known = registeredNonIc(value)
  if (known !== undefined) {
    return known
  }
  return value.startsWith(ACCM_PREFIX)
    ? `${ACCM_PREFIX}${value.slice(ACCM_PREFIX.length)}`
    : undefined
}

const registeredSci: Admits<SciControl> = oneOf(SCI_CONTROL_TOKENS)

/**
 * SCI compartments are programme names, and no vocabulary lists them. Only the
 * control the token is built on can be checked. The compartment is whatever
 * follows that control, so the value is rebuilt from the two parts.
 */
export const admitsSci: Admits<SciExpression> = (value) => {
  const control = registeredSci(stemOf(value, SCI_CONTROL_TOKENS))
  // Either there is no control to build on, or the token is the bare control.
  if (control === undefined || value === control) {
    return control
  }
  const opener = `${control}${COMPARTMENT}`
  return value.startsWith(opener)
    ? `${control}${COMPARTMENT}${value.slice(opener.length)}`
    : undefined
}
