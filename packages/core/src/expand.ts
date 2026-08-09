/**
 * Inverting the Compartment rendering in `compartment.ts`.
 *
 * Rendering emits only the last hyphen-separated part of a token and takes the
 * rest from its ancestors. To read it back, carry a running stem and attach it
 * again. The separator says what to do with that stem:
 *
 *   `/`   start a new control            SI/TK           -> SI, TK
 *   `-`   descend one level              SI-G            -> SI, SI-G
 *   ` `   another child of the same stem  SI-G ABCD ACDE -> …, SI-G-ABCD, SI-G-ACDE
 */
import { COMPARTMENT, ITEM, SUBCOMPARTMENT } from './syntax.ts'
import { SIGMA_QUALIFIER } from './tokens.ts'

const SEPARATORS: ReadonlySet<string> = new Set([ITEM, COMPARTMENT, SUBCOMPARTMENT])

/**
 * Splits on all three separators, remembering which preceded each part.
 *
 * The separator holds all the depth information. `compartment.ts` chose it from
 * the depth of the token and emitted nothing else, so reading it back must keep
 * the separator instead of splitting the parts again afterwards. A run can
 * return to depth 1 after a part at depth 2, as `SI-EU AAA-NK AAA` does.
 */
const segmented = (rendered: string): ReadonlyArray<readonly [string, string]> => {
  const parts: Array<readonly [string, string]> = []
  let separator = ''
  let current = ''

  for (const character of rendered) {
    if (SEPARATORS.has(character)) {
      parts.push([separator, current])
      separator = character
      current = ''
    } else {
      current += character
    }
  }
  parts.push([separator, current])

  return parts
}

/**
 * `SI-G ABCD ACDE/TK` -> `SI`, `SI-G`, `SI-G-ABCD`, `SI-G-ACDE`, `TK`.
 *
 * Depth 1 hangs off the control that opened the run. Depth 2 hangs off the
 * compartment before it. Compartments at the same depth are therefore siblings
 * and not a chain: `RSV-ABC-DEF` is `RSV-ABC` and `RSV-DEF`.
 */
export const expandCompartmented = (rendered: string): readonly string[] => {
  const tokens: string[] = []
  let control = ''
  let stem = ''

  for (const [separator, part] of segmented(rendered)) {
    if (separator === SUBCOMPARTMENT) {
      tokens.push(`${stem}${COMPARTMENT}${part}`)
      continue
    }
    if (separator === COMPARTMENT) {
      stem = `${control}${COMPARTMENT}${part}`
      tokens.push(stem)
      continue
    }

    control = part
    stem = part
    tokens.push(part)
  }

  return tokens
}

/**
 * `RD-CNWDI-SG 14 20/FRD-SG 14 20` -> `RD`, `RD-CNWDI`, `RD-SG-14`, `RD-SG-20`,
 * `FRD`, `FRD-SG-14`, `FRD-SG-20`.
 *
 * SIGMA values are registered tokens, not free compartments. A run of them
 * hangs off the control that opened the run. It does not hang off the previous
 * SIGMA, or off a compartment in between such as `CNWDI`.
 */
export const expandAtomicEnergy = (rendered: string): readonly string[] => {
  const tokens: string[] = []
  let control = ''
  let sigmaStem = ''

  for (const [separator, part] of segmented(rendered)) {
    if (separator === SUBCOMPARTMENT) {
      // A SIGMA number, hanging off the `SG` stem the run established.
      tokens.push(`${sigmaStem}${COMPARTMENT}${part}`)
      continue
    }
    if (separator === COMPARTMENT) {
      const stem = `${control}${COMPARTMENT}${part}`
      if (part === SIGMA_QUALIFIER) {
        // `RD-SG` is not a token. Every SIGMA value is registered, so this stem
        // exists only to carry the numbers that follow.
        sigmaStem = stem
      } else {
        tokens.push(stem)
      }
      continue
    }

    control = part
    tokens.push(part)
  }

  return tokens
}
