/**
 * Reading the dissemination segment.
 *
 * This is the only segment that holds more than one list syntax at once. `REL
 * TO` and `DISPLAY ONLY` take a list separated by commas. `EYES ONLY` takes one
 * separated by slashes, and a slash also separates the controls themselves. The
 * segment cannot simply be split.
 */
import type { Draft } from './draft.ts'
import { unspellEntity } from './entity-spelling.ts'
import { DISSEM_CONTROL_TOKENS } from './generated/vocab.ts'
import { unspell } from './spelling.ts'
import { DISPLAY_ONLY as DISPLAY_ONLY_PHRASE, EYES_ONLY, ITEM, LIST, REL_TO } from './syntax.ts'
import { DISPLAY_ONLY, EYES, OC, OC_USGOV, REL } from './tokens.ts'

const DISSEM = new Set<string>(DISSEM_CONTROL_TOKENS)

/** Whether an entry is a dissemination control in its own right. */
const isControlEntry = (entry: string): boolean =>
  entry.startsWith(REL_TO) ||
  entry.endsWith(EYES_ONLY) ||
  entry.startsWith(DISPLAY_ONLY_PHRASE) ||
  DISSEM.has(unspell(entry))

/**
 * Splits the segment into entries, keeping an `EYES ONLY` list whole.
 *
 * Neither `RS/USA/GBR EYES ONLY` nor `USA/GBR EYES ONLY/DSEN` can be split on
 * the delimiter alone, and the list is not always last. They can still be told
 * apart. An `EYES ONLY` list holds releasability entities, and no entity is also
 * a dissemination control, so the list is the run of non-control parts that ends
 * at the `EYES ONLY` part. It is found by absorbing backwards from there.
 */
const dissemEntries = (segment: string): readonly string[] => {
  const entries: string[] = []

  for (const part of segment.split(ITEM)) {
    if (!part.endsWith(EYES_ONLY)) {
      entries.push(part)
      continue
    }
    let start = entries.length
    while (start > 0 && !isControlEntry(entries[start - 1] ?? '')) {
      start -= 1
    }
    const absorbed = entries.splice(start)
    absorbed.push(part)
    entries.push(absorbed.join(ITEM))
  }

  return entries
}

export const looksLikeDissem = (segment: string): boolean =>
  dissemEntries(segment).every((entry) => isControlEntry(entry))

export const readDissem = (segment: string, draft: Draft): void => {
  const controls: string[] = []

  for (const entry of dissemEntries(segment)) {
    if (entry.startsWith(REL_TO)) {
      controls.push(REL)
      draft.releasableTo = entry
        .slice(REL_TO.length)
        .split(LIST)
        .map((e) => unspellEntity(e))
    } else if (entry.endsWith(EYES_ONLY)) {
      controls.push(EYES)
      draft.releasableTo = entry
        .slice(0, -EYES_ONLY.length)
        .split(ITEM)
        .map((e) => unspellEntity(e))
    } else if (entry.startsWith(DISPLAY_ONLY_PHRASE)) {
      controls.push(DISPLAY_ONLY)
      draft.displayOnlyTo = entry
        .slice(DISPLAY_ONLY_PHRASE.length)
        .split(LIST)
        .map((e) => unspellEntity(e))
    } else {
      const control = unspell(entry)
      // The inverse of consumption. `OC-USGOV` renders from an attribute set
      // that holds both, so reading it back restores the one it consumed. This
      // is the same shape as an SCI compartment supplying its ancestors. `OC` is
      // restored before it, because that is where Canonical Order puts it.
      if (control === OC_USGOV) {
        controls.push(OC)
      }
      controls.push(control)
    }
  }

  draft.disseminationControls = controls
}
