/**
 * Reading rendered wording back to the tokens it was spelled from.
 *
 * `format` expands a token into the wording a document carries. `NF` becomes
 * `NOFORN` and `SG` becomes `SIGMA`. Every function here inverts one of those
 * fixed vocabulary expansions. Entity-name spelling has its own bidirectional
 * module because it also has to recover multi-word names.
 *
 * They are apart from the segment readers because they are pure text. They do
 * not know which field the text belongs to.
 */
import { BANNER_SPELLING } from './generated/banner.ts'
import { SECOND_BANNER_LINE_DESCRIPTIONS } from './generated/vocab.ts'
import {
  BANNER_ATOMIC_ENERGY,
  BANNER_ORCON_USGOV,
  BANNER_SIGMA,
  NON_US_QUALIFIER,
} from './syntax.ts'
import { ATOMAL, BALK, BOHEMIA, OC_USGOV, SIGMA_QUALIFIER } from './tokens.ts'

/** Banner spellings, inverted, so `NOFORN` reads back as `NF`. */
const FROM_BANNER: Readonly<Record<string, string>> = Object.fromEntries([
  ...Object.entries(BANNER_SPELLING).map(([token, spelling]) => [spelling, token]),
  // The spellings the reference stylesheets patch in rather than registering.
  [BANNER_ORCON_USGOV, OC_USGOV],
  ...Object.entries(BANNER_ATOMIC_ENERGY).map(([token, spelling]) => [spelling, token]),
])

/** Second banner lines spell out from their CVE descriptions, not BannerMapping. */
export const SECOND_LINE_TOKENS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SECOND_BANNER_LINE_DESCRIPTIONS).map(([token, text]) => [text, token]),
)

/**
 * A non-US control has no segment of its own. It is appended to the SCI or
 * atomic energy segment, so reading that segment back means taking the control
 * off again and restoring the `NATO-` qualifier the vocabulary registers.
 */
export const NON_US_BY_BARE: Readonly<Record<string, string>> = {
  [BOHEMIA.replace(NON_US_QUALIFIER, '')]: BOHEMIA,
  [BALK.replace(NON_US_QUALIFIER, '')]: BALK,
  [ATOMAL.replace(NON_US_QUALIFIER, '')]: ATOMAL,
}

export const unspell = (text: string): string => FROM_BANNER[text] ?? text

/** A Banner Line spells `SG` as `SIGMA` and expands DCNI/UCNI. */
export const unbannerAtomic = (segment: string): string => {
  let text = segment.replaceAll(`${BANNER_SIGMA}`, SIGMA_QUALIFIER)
  for (const [token, spelling] of Object.entries(BANNER_ATOMIC_ENERGY)) {
    text = text.replaceAll(spelling, token)
  }
  return text
}
