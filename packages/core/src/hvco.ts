import { HVCO } from './tokens.ts'

/** Reports why an HVCO token and its interpolated channel text do not form a valid pair. */
export const hvcoChannelProblem = (
  secondBannerLine: readonly string[] | undefined,
  handleViaChannels: string | undefined,
): string | undefined => {
  const hasHvco = secondBannerLine?.includes(HVCO) ?? false
  const meaningful = handleViaChannels !== undefined && handleViaChannels.trim() !== ''

  if (hasHvco && !meaningful) {
    return 'HVCO requires a non-empty handleViaChannels value'
  }
  if (!hasHvco && handleViaChannels !== undefined) {
    return 'handleViaChannels requires HVCO in secondBannerLine'
  }
  if (handleViaChannels !== undefined && handleViaChannels !== handleViaChannels.trim()) {
    return 'handleViaChannels cannot have leading or trailing whitespace'
  }
  if (handleViaChannels !== undefined && /[/|\r\n]/u.test(handleViaChannels)) {
    return 'handleViaChannels cannot contain second-line item or line delimiters'
  }
  return undefined
}
