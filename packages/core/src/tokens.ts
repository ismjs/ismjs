/**
 * The controlled vocabulary values this library refers to by name.
 *
 * Each one is checked against its generated type with `satisfies`. A DES release
 * that retires a token therefore fails compilation here, and does not change
 * what the library renders without saying so.
 *
 * That check is why these are separate from the delimiters and fixed wording in
 * `syntax.ts`, which have nothing to check against.
 */
import type { OwnerProducer } from './generated/ismcat.ts'
import type {
  AtomicEnergyMarking,
  DissemControl,
  NonUsControl,
  SecondBannerLine,
  UsClassification,
} from './generated/vocab.ts'

/** The only classification a pure CUI Marking may carry. */
export const UNCLASSIFIED = 'U' satisfies UsClassification

export const USA = 'USA' satisfies OwnerProducer
export const NATO = 'NATO' satisfies OwnerProducer

/** A NATO sub-organisation is written `NATO:` and then a free name. */
export const NATO_PREFIX = `${NATO}:`

/** Dissemination controls whose rendering is not a simple token lookup. */
export const REL = 'REL' satisfies DissemControl
export const EYES = 'EYES' satisfies DissemControl
export const DISPLAY_ONLY = 'DISPLAYONLY' satisfies DissemControl
export const OC = 'OC' satisfies DissemControl
export const OC_USGOV = 'OC-USGOV' satisfies DissemControl

/** Carried in the attribute set and deliberately never rendered. */
export const EXEMPT_FROM_DISCOVERY = 'EXEMPT_FROM_ICD501_DISCOVERY' satisfies DissemControl

/** Second banner line entry that interpolates `handleViaChannels`. */
export const HVCO = 'HVCO' satisfies SecondBannerLine

/** Non-US controls, each appended to the segment it qualifies. */
export const ATOMAL = 'NATO-ATOMAL' satisfies NonUsControl
export const BOHEMIA = 'NATO-BOHEMIA' satisfies NonUsControl
export const BALK = 'NATO-BALK' satisfies NonUsControl

/**
 * SIGMA values look like subcompartments and are not. A run of them shares one
 * `SG` qualifier. `RD-SG-14` is a registered token, so this is a fragment of a
 * token and not a token itself.
 */
export const SIGMA_QUALIFIER = 'SG'

/** Atomic energy markings are enumerated down to each SIGMA value. */
export const RESTRICTED_DATA = 'RD' satisfies AtomicEnergyMarking
