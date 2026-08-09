/**
 * Expanding and combining releasability entities.
 *
 * A tetragraph names a coalition. `FVEY` stands for five countries, so two
 * releasability lists cannot be compared until they are written in the same
 * terms. `REL TO USA, GBR` and `REL TO FVEY` are not the same list, but the
 * first is a subset of the second, and only expansion shows that.
 *
 * Expanding and combining are inverse over any list whose tetragraphs all
 * decompose. They are not inverse over a list that names a coalition it does not
 * fully cover. See `combineEntities`.
 */
import { TETRAGRAPH_MEMBERSHIP } from './generated/tetragraph.ts'
import type { Tetragraph } from './generated/ismcat.ts'

const MEMBERSHIP: Readonly<Record<string, readonly string[]>> = TETRAGRAPH_MEMBERSHIP

/** Entries longest-first, so a larger coalition is preferred when combining. */
const BY_SIZE: readonly (readonly [string, readonly string[]])[] = Object.entries(MEMBERSHIP)
  .map(([token, members]): readonly [string, readonly string[]] => [token, members])
  .toSorted((a, b) => b[1].length - a[1].length)

/** Whether a tetragraph publishes its membership. `GCCH` does not. */
export const decomposes = (entity: string): boolean => MEMBERSHIP[entity] !== undefined

/** What an entity stands for: its members, or itself. */
export const membersOf = (entity: string): readonly string[] => MEMBERSHIP[entity] ?? [entity]

/**
 * Replace every decomposable tetragraph with the entities it stands for.
 *
 * `['USA', 'FVEY']` becomes `['USA', 'AUS', 'CAN', 'NZL', 'GBR']`, deduplicated
 * and in first-seen order. A tetragraph that does not decompose is left alone,
 * which is what `ism-func:getTetragraphMembership` does.
 */
export const expandEntities = (entities: readonly string[]): readonly string[] => [
  ...new Set(entities.flatMap((entity) => membersOf(entity))),
]

/**
 * Replace any fully covered coalition with its tetragraph.
 *
 * The inverse of `expandEntities`, with one asymmetry. A list is collapsed only
 * when every member is present, so `['AUS', 'CAN']` stays as it is and does not
 * become `ACGU`. Larger coalitions are tried first, so a list that covers both
 * `FVEY` and `ACGU` collapses to the larger one.
 *
 * A member consumed by a coalition is removed. Anything else keeps its place.
 */
export const combineEntities = (entities: readonly string[]): readonly string[] => {
  const remaining = new Set(entities)
  const found: string[] = []

  for (const [token, members] of BY_SIZE) {
    if (remaining.has(token) || !members.every((m) => remaining.has(m))) {
      continue
    }
    for (const member of members) {
      remaining.delete(member)
    }
    found.push(token)
  }

  // Original order for what survived, then the coalitions that replaced the rest.
  return [...entities.filter((e) => remaining.has(e)), ...found]
}

export type { Tetragraph }
