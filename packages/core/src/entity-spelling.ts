/**
 * Spelling entity names in both directions.
 *
 * Registered entity tokens use underscores, and NATO sub-organisations use a
 * colon after `NATO`. Rendered markings show both separators as spaces. This
 * module owns that ambiguity and the longest-match lookup needed to recover a
 * space-separated entity list.
 */
import {
  FGI_OPEN_ENTITY_TOKENS,
  FGI_PROTECTED_ENTITY_TOKENS,
  REL_TO_ENTITY_TOKENS,
} from './generated/ismcat.ts'
import { WORD } from './syntax.ts'
import { NATO, NATO_PREFIX } from './tokens.ts'

const ENTITY_SPACERS = ['_', ':'] as const

/** Sub-organisation names carry underscores and colons that render as spaces. */
export const spellEntity = (entity: string): string => {
  let text = entity
  for (const spacer of ENTITY_SPACERS) {
    text = text.replaceAll(spacer, WORD)
  }
  return text
}

/** Entities render with spaces where the attribute holds `_` or `:`. */
export const unspellEntity = (text: string): string => {
  if (!text.includes(WORD)) {
    return text
  }
  // A space came from either `:` or `_`, and only NATO has sub-organisations. A
  // leading `NATO` therefore takes the colon back, and every other space becomes
  // an underscore.
  const [organisation = '', ...rest] = text.split(WORD)
  return organisation === NATO ? `${NATO_PREFIX}${rest.join('_')}` : text.replaceAll(WORD, '_')
}

/**
 * Registered entities whose name renders as more than one word, inverted.
 *
 * Built with the same spelling function rendering uses, so the two directions
 * cannot drift. Without this lookup, a multi-word name in an FGI list would be
 * indistinguishable from several entities.
 */
const FROM_SPELLED_ENTITY: ReadonlyMap<string, string> = new Map(
  [...new Set([...FGI_OPEN_ENTITY_TOKENS, ...FGI_PROTECTED_ENTITY_TOKENS, ...REL_TO_ENTITY_TOKENS])]
    .filter((token) => ENTITY_SPACERS.some((spacer) => token.includes(spacer)))
    .map((token) => [spellEntity(token), token]),
)

const LONGEST_ENTITY = Math.max(
  1,
  ...[...FROM_SPELLED_ENTITY.keys()].map((spelled) => spelled.split(WORD).length),
)

/** How many words a registered entity claims here, longest first, or 0. */
const registeredRun = (words: readonly string[], index: number): number => {
  for (let take = Math.min(LONGEST_ENTITY, words.length - index); take > 1; take -= 1) {
    if (FROM_SPELLED_ENTITY.has(words.slice(index, index + take).join(WORD))) {
      return take
    }
  }
  return 0
}

/** Recover whole entities after a rendered list has been split on spaces. */
export const rejoinEntities = (words: readonly string[]): readonly string[] => {
  const entities: string[] = []

  for (let index = 0; index < words.length; index += 1) {
    const take = registeredRun(words, index)
    if (take > 0) {
      entities.push(FROM_SPELLED_ENTITY.get(words.slice(index, index + take).join(WORD)) ?? '')
      index += take - 1
      continue
    }

    const word = words[index] ?? ''
    const next = words[index + 1]
    if (word === NATO && next !== undefined) {
      entities.push(`${NATO_PREFIX}${next}`)
      index += 1
    } else {
      entities.push(word)
    }
  }

  return entities
}
