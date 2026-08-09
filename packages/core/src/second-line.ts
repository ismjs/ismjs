/**
 * The second Banner Line, appended to the first after a pipe.
 *
 * This has its own file because it is the one place a CVE description is
 * rendering data and not a label. An entry spells out from
 * `SECOND_BANNER_LINE_DESCRIPTIONS`, and the description of `HVCO` leaves a gap
 * for the channels that `handleViaChannels` names: `HANDLE VIA … CHANNELS
 * ONLY`.
 */
import { SECOND_BANNER_LINE_DESCRIPTIONS } from './generated/vocab.ts'
import type { Marking } from './marking.ts'
import { HANDLE_VIA, ITEM, SECOND_LINE } from './syntax.ts'
import { HVCO } from './tokens.ts'

export const secondBannerLine = (marking: Marking): string => {
  const lines = marking.secondBannerLine
  if (lines === undefined) {
    return ''
  }
  const rendered = lines.map((token) => {
    const description = SECOND_BANNER_LINE_DESCRIPTIONS[token]
    return token === HVCO
      ? description.replace(HANDLE_VIA, `${HANDLE_VIA}${marking.handleViaChannels ?? ''} `)
      : description
  })
  return SECOND_LINE + rendered.join(ITEM)
}

// ---------------------------------------------------------------------------
