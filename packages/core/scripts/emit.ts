/**
 * TypeScript emission helpers for codegen.
 *
 * A vocabulary is emitted as an ordered token array. Its union type derives from
 * that array. Its description table is checked against the union with
 * `satisfies Readonly<Record<T, string>>`.
 *
 * That check lets the description tables live in a different module. A missing
 * description, or one for a token that does not exist, is a compile error. The
 * single-file build cannot tree-shake, so the descriptions must stay out of it.
 */

export type Term = {
  value: string
  description: string
  /** ISO date the term was deprecated, when it has been. */
  deprecated?: string
}

export const quote = (s: string): string => `'${s.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u

/** Object keys stay bare when they are valid identifiers, quoted otherwise. */
export const key = (s: string): string => (IDENTIFIER.test(s) ? s : quote(s))

/** The vocabulary itself: an ordered array, the one place its tokens appear. */
export const tokenArray = (name: string, values: readonly string[]): string =>
  values.length === 0
    ? `export const ${name} = [] as const\n`
    : `export const ${name} = [\n${values.map((v) => `  ${quote(v)},`).join('\n')}\n] as const\n`

/** For vocabularies whose source of truth is an ordered token array. */
export const derivedType = (type: string, constName: string): string =>
  `export type ${type} = (typeof ${constName})[number]\n`

/**
 * A description table, checked against the token union it describes. A missing
 * key, or one for a token that does not exist, is a compile error.
 */
export const describedBy = (name: string, type: string, terms: readonly Term[]): string =>
  `export const ${name} = {\n${terms
    .map((t) => `  ${key(t.value)}: ${quote(t.description)},`)
    .join('\n')}\n} as const satisfies Readonly<Record<${type}, string>>\n`

/**
 * An object built by spreading other tables, with literal entries first. A
 * superset table is composed from its parts, not written out again.
 */
export const composedObject = (
  name: string,
  type: string,
  entries: readonly Term[],
  spreads: readonly string[],
): string => {
  const literal = entries.map((t) => `  ${key(t.value)}: ${quote(t.description)},`)
  const spread = spreads.map((s) => `  ...${s},`)
  return (
    `export const ${name} = {\n${[...literal, ...spread].join('\n')}\n` +
    `} as const satisfies Readonly<Record<${type}, string>>\n`
  )
}

/**
 * `satisfies` rather than a type annotation. The literal values stay literal,
 * and membership is checked at compile time instead of only by a test.
 */
export const satisfiesArray = (
  name: string,
  elementType: string,
  values: readonly string[],
): string =>
  values.length === 0
    ? `export const ${name} = [] as const satisfies readonly ${elementType}[]\n`
    : `export const ${name} = [\n${values
        .map((v) => `  ${quote(v)},`)
        .join('\n')}\n] as const satisfies readonly ${elementType}[]\n`

/** Partial: only deprecated tokens appear, so a lookup may legitimately miss. */
export const deprecations = (name: string, type: string, terms: readonly Term[]): string => {
  const contract = `Readonly<Partial<Record<${type}, string>>>`
  const deprecated = terms.filter((t) => t.deprecated !== undefined)
  if (deprecated.length === 0) {
    return `export const ${name} = {} as const satisfies ${contract}\n`
  }
  return `export const ${name} = {\n${deprecated
    .map((t) => `  ${key(t.value)}: ${quote(t.deprecated as string)},`)
    .join('\n')}\n} as const satisfies ${contract}\n`
}
