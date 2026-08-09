/**
 * Canonical Order — the one correct sequence for a Marking's multi-valued
 * fields, fixed by the governing controlled vocabulary.
 *
 * `Canonical<T>` is a branded array minted only by the normalization helpers,
 * so a Marking cannot hold a field that is unordered or duplicated. Deterministic
 * storage supports the structural round-trip law and its explicitly tested loss
 * cases. See
 * docs/adr/0002-canonical-order-via-branded-arrays.md.
 */

declare const canonical: unique symbol

/** A list guaranteed to hold at least one element. */
export type NonEmpty<T> = readonly [T, ...T[]]

/** A deduplicated token list in Canonical Order. */
export type Canonical<T extends string> = readonly T[] & {
  readonly [canonical]: true
}

/**
 * Canonical and known to hold at least one token, so `[0]` needs no guard.
 * `ownerProducer` is the only field where ISM requires this.
 *
 * This intersects with `NonEmpty` instead of restating the shape. A
 * canonicalised Marking therefore stays assignable to `MarkingInput`, which
 * makes `canonicalize` idempotent in the type system as well as at runtime.
 */
export type CanonicalNonEmpty<T extends string> = Canonical<T> & NonEmpty<T>

/**
 * The only two places where the brand is claimed.
 *
 * A phantom brand exists only in the type system, so nothing can construct one.
 * An assertion somewhere is unavoidable. Asserting it loosely, or in several
 * places, is avoidable, so both claims stay here.
 *
 * Each one is a downcast, not an override. `Canonical<T>` is assignable to
 * `readonly T[]`, so this narrows a value the checker already accepts. It does
 * not bypass the checker. `as unknown as` would claim more than is true.
 */
const asCanonical = <T extends string>(values: readonly T[]): Canonical<T> => values as Canonical<T>

const asCanonicalNonEmpty = <T extends string>(values: readonly T[]): CanonicalNonEmpty<T> =>
  values as CanonicalNonEmpty<T>

/**
 * The registered token a value is built on: the longest vocabulary entry the
 * value either equals or extends with a hyphen. `SI-G-ABCD` stems from `SI-G`
 * rather than `SI`, because a compartment hangs off the most specific control
 * that admits it.
 *
 * Returns the value itself when the vocabulary does not hold it, so an unknown
 * token orders as its own stem.
 */
export const stemOf = (value: string, vocabulary: readonly string[]): string => {
  let stem = value
  let longest = -1

  for (const entry of vocabulary) {
    if (value !== entry && !value.startsWith(`${entry}-`)) {
      continue
    }
    if (entry.length > longest) {
      longest = entry.length
      stem = entry
    }
  }

  return stem
}

/**
 * Deduplicate and order by the vocabulary.
 *
 * Tokens sort by the position of their stem, and then lexically among
 * themselves, which keeps a control and its compartments together as one run:
 * `SI`, `SI-G`, `SI-G-ABCD`, `SI-G-ACDE`, `TK`.
 *
 * This does not drop a general control when a more specific one is present, and
 * that is deliberate. Rendering emits only the last hyphen-separated part of a
 * token and needs the ancestors to supply the rest: `SI SI-G SI-G-ABCD` renders
 * as `SI-G ABCD`, built from all three. Without `SI` it renders as `-G ABCD`.
 * Every SCI and atomic energy value in the corpus carries each token with its
 * ancestors, and the register requires that.
 */
export const canonicalTokens = <T extends string>(
  values: readonly T[],
  vocabulary: readonly string[],
): Canonical<T> => {
  const unique = [...new Set(values)]
  const stems = new Map<string, string>(unique.map((v) => [v, stemOf(v, vocabulary)]))

  const rank = (value: string): number => {
    const index = vocabulary.indexOf(stems.get(value) ?? value)
    return index === -1 ? vocabulary.length : index
  }

  const ordered: readonly T[] = unique.toSorted(
    (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0),
  )

  return asCanonical(ordered)
}

/**
 * As `canonicalTokens`, for a field that cannot legitimately be empty.
 *
 * Canonicalisation never empties a non-empty list: deduplication retains one of
 * every supplied value and ordering changes no membership. An empty result
 * therefore means an empty input. The type forbids that, but a JavaScript caller
 * and `any` do not.
 *
 * The check runs before `asCanonicalNonEmpty`, so by the time that is reached,
 * non-emptiness is a fact and not a claim.
 */
export const canonicalNonEmpty = <T extends string>(
  values: NonEmpty<T>,
  vocabulary: readonly string[],
): CanonicalNonEmpty<T> => {
  const ordered = canonicalTokens(values, vocabulary)
  if (ordered.length === 0) {
    throw new TypeError('expected at least one token, received an empty list')
  }
  return asCanonicalNonEmpty(ordered)
}

/**
 * Re-mints the brand for a rearrangement of an already-canonical list.
 *
 * Two fields need a second pass that the vocabulary cannot express. NATO
 * sub-organisations go into NATO's own place, sorted among themselves. The
 * result is still canonical, but it is not what `canonicalTokens` returned, so
 * the brand must be claimed again.
 *
 * The claim rests on evidence. A rearrangement can drop values — the reference
 * sort loses a bare `NATO` — but it must never add one or repeat one, and that
 * is checked here.
 */
export const canonicalRearrangement = <T extends string>(
  values: readonly T[],
  of: Canonical<T>,
): Canonical<T> => {
  const source = new Set<string>(of)
  if (new Set(values).size !== values.length || !values.every((v) => source.has(v))) {
    throw new TypeError('a rearrangement may drop tokens, but not add or repeat them')
  }
  return asCanonical(values)
}

/**
 * Whether a list is already canonical. `parse` uses this to report input that is
 * out of order instead of repairing it without saying so.
 */
export const isCanonical = <T extends string>(
  values: readonly T[],
  vocabulary: readonly string[],
): values is Canonical<T> => {
  const expected = canonicalTokens(values, vocabulary)
  return values.length === expected.length && values.every((v, i) => v === expected[i])
}
