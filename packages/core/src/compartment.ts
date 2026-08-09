/**
 * Rendering a run of controls and their Compartments.
 *
 * The depth of a token is its hyphen count. Only the last hyphen-separated part
 * is emitted, and the ancestors supply the rest, which is why they survive
 * canonicalisation. The separator comes from the depth:
 *
 *   depth 0, not first  `/`     SI  TK          -> SI/TK
 *   depth 1             `-`     SI  SI-G        -> SI-G
 *   depth 2             ` `     SI-G  SI-G-ABCD -> SI-G ABCD
 *
 * Mirrors `ism-func:get.sci` and `ism-func:getAEA` in IC-ISM-Functions.xsl.
 */

import { BANNER_ATOMIC_ENERGY, BANNER_SIGMA, COMPARTMENT, ITEM, SUBCOMPARTMENT } from './syntax.ts'
import { SIGMA_QUALIFIER } from './tokens.ts'

const partsOf = (token: string): readonly string[] => token.split(COMPARTMENT)

const lastPart = (parts: readonly string[]): string => parts.at(-1) ?? ''

/** The separator a token contributes before its own text. */
const separator = (depth: number, isFirst: boolean): string => {
  if (depth === 1) {
    return COMPARTMENT
  }
  if (depth === 2) {
    return SUBCOMPARTMENT
  }
  return isFirst ? '' : ITEM
}

/** SCI controls: `SI SI-G SI-G-ABCD SI-G-ACDE TK` -> `SI-G ABCD ACDE/TK`. */
export const renderCompartmented = (tokens: readonly string[]): string =>
  tokens
    .map((token, index) => {
      const parts = partsOf(token)
      return separator(parts.length - 1, index === 0) + lastPart(parts)
    })
    .join('')

/**
 * Atomic energy markings differ in one way. SIGMA values look like
 * subcompartments and are not, so the first of a consecutive SIGMA run puts back
 * the `SG`, or `SIGMA` in a Banner Line, and the rest add only their number.
 *
 *   RD RD-CNWDI RD-SG-14      -> RD-CNWDI-SG 14
 *   FRD FRD-SG-14 FRD-SG-20   -> FRD-SG 14 20
 */
export const renderAtomicEnergy = (tokens: readonly string[], banner: boolean): string =>
  tokens
    .map((token, index) => {
      const parts = partsOf(token)
      const depth = parts.length - 1
      const text = lastPart(parts)
      const spelled = (banner ? BANNER_ATOMIC_ENERGY[text] : undefined) ?? text

      if (depth !== 2) {
        return separator(depth, index === 0) + spelled
      }

      const previous = partsOf(tokens[index - 1] ?? '')
      const continuesSigmaRun =
        parts.at(-2) === SIGMA_QUALIFIER && previous.at(-2) === SIGMA_QUALIFIER
      const head = continuesSigmaRun
        ? ''
        : `${COMPARTMENT}${banner ? BANNER_SIGMA : (parts.at(-2) ?? '')}`

      return `${head}${SUBCOMPARTMENT}${spelled}`
    })
    .join('')
