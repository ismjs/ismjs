import { NON_IC_MARKING_TOKENS } from './generated/vocab.ts'
import { ACCM_PREFIX } from './syntax.ts'
import { ATOMAL, BALK, BOHEMIA } from './tokens.ts'

/**
 * Presentation Order is a lossless view of a canonically ordered Marking field.
 * These transformations arrange values for string syntax; they never normalize
 * the stored field or change its token membership.
 */

/** Non-US controls travel in the order of the host segments that render them. */
export const NON_US_SCI_RENDER_ORDER = [BOHEMIA, BALK] as const
export const NON_US_ATOMIC_RENDER_ORDER = [ATOMAL] as const

export const orderNonUsForRendering = (controls: readonly string[]): readonly string[] =>
  [...NON_US_SCI_RENDER_ORDER, ...NON_US_ATOMIC_RENDER_ORDER].filter((control) =>
    controls.includes(control),
  )

/** ACCM entries render directly after DS rather than at their Canonical Order rank. */
export const orderNonIcForRendering = (markings: readonly string[]): readonly string[] => {
  const accm = markings.filter((marking) => marking.startsWith(ACCM_PREFIX)).toSorted()
  if (accm.length === 0) {
    return markings
  }
  const rest = markings.filter((marking) => !marking.startsWith(ACCM_PREFIX))
  const firstRank = NON_IC_MARKING_TOKENS[0]
  return [
    ...rest.filter((marking) => marking === firstRank),
    ...accm,
    ...rest.filter((marking) => marking !== firstRank),
  ]
}
