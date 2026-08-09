import { RenderMode } from '../src/format.ts'
import type { Marking } from '../src/marking.ts'
import { FGI_MARKER } from '../src/generated/ismcat.ts'
import { ATOMAL, NATO, USA } from '../src/tokens.ts'

/**
 * Constructs that a rendered Marking cannot carry, so `parse` cannot recover
 * them.
 *
 * These are not defects in `parse`. The marking string holds less than the
 * attribute set does. In one case, `FGIsourceProtected`, the string conceals its
 * own contents on purpose.
 *
 * One definition serves the corpus round-trip and the generated-Marking
 * property, so neither can start excusing what the other rejects. Every caller
 * asserts the loss as a loss instead of skipping it. If one of these begins to
 * round-trip, the test fails and the entry is removed.
 */
export const lossy = (marking: Marking, mode: RenderMode): string | undefined => {
  const usOwned = marking.ownerProducer.length === 1 && marking.ownerProducer[0] === USA

  // A protected source renders as the bare `FGI` marker. Where the attribute
  // holds only that marker, there is nothing to lose. Where it names countries,
  // concealing them is the purpose of the marking.
  const protectedSources: readonly string[] = marking.FGIsourceProtected ?? []
  if (protectedSources.some((source) => source !== FGI_MARKER)) {
    return 'FGIsourceProtected names a source the marking exists to conceal'
  }
  if (marking.FGIsourceOpen !== undefined && !usOwned) {
    return 'FGI is only marked on a US-controlled document'
  }

  // An FGI list is separated by spaces, and a NATO sub-organisation renders its
  // colon as a space. `FGI NATO PSMX` is therefore both `NATO:PSMX` and `NATO`
  // beside `PSMX`, and nothing in the string separates the two readings. `parse`
  // takes the sub-organisation, so a bare `NATO` followed by anything is lost.
  // ISM also treats a bare `NATO` as fragile here: the reference sort removes it
  // when sub-organisations are present.
  const openSources: readonly string[] = marking.FGIsourceOpen ?? []
  const bareNato = openSources.indexOf(NATO)
  if (bareNato !== -1 && bareNato < openSources.length - 1) {
    return 'a bare NATO in an FGI list cannot be told from a NATO sub-organisation'
  }

  // Each non-US control rides on one segment: ATOMAL on the atomic energy
  // markings, BOHEMIA and BALK on the SCI controls. Without that host segment
  // there is nowhere to render it.
  const nonUs: readonly string[] = marking.nonUSControls ?? []
  const orphaned =
    (nonUs.includes(ATOMAL) && marking.atomicEnergyMarkings === undefined) ||
    (nonUs.some((c) => c !== ATOMAL) && marking.SCIcontrols === undefined)
  if (orphaned) {
    return 'a non-US control has no host segment to be carried on'
  }

  if (marking.secondBannerLine !== undefined && mode === RenderMode.Portion) {
    return 'a Portion Mark carries no second banner line'
  }

  return undefined
}
