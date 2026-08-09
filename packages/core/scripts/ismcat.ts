/**
 * Generates `src/generated/ismcat.ts`.
 *
 * The four ISMCAT vocabularies are ownerProducer, releasableTo, FGIsourceOpen
 * and FGIsourceProtected. Each one combines the same two lists: GENC country
 * trigraphs and IC coalition tetragraphs. Every CVE gives the same description
 * to a shared entry. So this emits the descriptions once, the two lists once,
 * and each vocabulary as a composition of them.
 *
 * Each composition is checked against its own CVE before anything is written. A
 * future DES release that changes the makeup fails the build.
 */
import { FGI_MARKER, literalsAndPatterns, write } from './cve.ts'
import {
  type Term,
  composedObject,
  deprecations,
  derivedType,
  describedBy,
  quote,
  satisfiesArray,
  tokenArray,
} from './emit.ts'
import { ISMCAT_TETRAGRAPH_CVE, ISMCAT_VOCABULARIES } from './manifest.ts'

/** One description table for every ISMCAT entity, asserting the CVEs agree. */
const mergeEntities = (sources: readonly string[]): Map<string, Term> => {
  const merged = new Map<string, Term>()

  for (const name of sources) {
    for (const term of literalsAndPatterns('ISMCAT', name).literals) {
      const existing = merged.get(term.value)
      if (existing === undefined) {
        merged.set(term.value, term)
      } else if (
        existing.description !== term.description ||
        existing.deprecated !== term.deprecated
      ) {
        throw new Error(
          `ISMCAT vocabularies disagree about ${term.value}: ` +
            `${JSON.stringify(existing)} vs ${JSON.stringify(term)} (in ${name})`,
        )
      }
    }
  }

  return merged
}

const assertComposition = (
  cveName: string,
  composed: readonly string[],
  expected: readonly string[],
): void => {
  if (composed.length === expected.length && composed.every((t, i) => t === expected[i])) {
    return
  }
  const at = composed.findIndex((t, i) => t !== expected[i])
  throw new Error(
    `${cveName}: composition does not reproduce the CVE ` +
      `(${composed.length} vs ${expected.length} tokens` +
      (at >= 0 ? `, first difference at ${at}: ${composed[at]} vs ${expected[at]}` : '') +
      '). Update ISMCAT_VOCABULARIES in scripts/manifest.ts.',
  )
}

/**
 * The union type follows the composition. A lead that is not a trigraph is added
 * by name. An excluded trigraph is removed with `Exclude`.
 */
const unionFor = (
  v: (typeof ISMCAT_VOCABULARIES)[number],
  trigraphTokens: readonly string[],
): string => {
  const extraLeads = v.lead.filter((t) => !trigraphTokens.includes(t))
  const removed = v.excludeTrigraphs.map((t) => quote(t)).join(' | ')
  const trigraphPart = removed === '' ? 'Trigraph' : `Exclude<Trigraph, ${removed}>`
  return [...extraLeads.map((t) => quote(t)), trigraphPart, 'Tetragraph'].join(' | ')
}

/**
 * Filter only on tokens that are trigraphs. `FGI` leads several vocabularies but
 * is not a country, so a test for it here is a comparison TypeScript proves is
 * always false.
 */
const trigraphSpread = (
  excluded: ReadonlySet<string>,
  trigraphTokens: readonly string[],
): string => {
  const filtered = [...excluded].filter((t) => trigraphTokens.includes(t))
  return filtered.length === 0
    ? '  ...TRIGRAPH_TOKENS,\n'
    : `  ...TRIGRAPH_TOKENS.filter((t) => ${filtered
        .map((t) => `t !== ${quote(t)}`)
        .join(' && ')}),\n`
}

/**
 * The two groups on their own, and the superset composed from them. Each entity
 * is described once, in the group it belongs to.
 */
const emitSharedGroups = (
  merged: ReadonlyMap<string, Term>,
  trigraphTokens: readonly string[],
  tetragraphTokens: readonly string[],
): string[] => {
  return [
    '// The FGI marker is not a country — it stands for Foreign Government\n' +
      '// Information whose source is concealed.\n' +
      `export const FGI_MARKER = ${quote(FGI_MARKER)}\n`,
    `// GENC country codes, alphabetical — ${trigraphTokens.length} entries\n` +
      tokenArray('TRIGRAPH_TOKENS', trigraphTokens),
    derivedType('Trigraph', 'TRIGRAPH_TOKENS'),
    `// IC Markings Register coalition codes — ${tetragraphTokens.length} entries.\n` +
      '// Not all are four characters: EU, NSG and AUSTRALIA_GROUP are here too.\n' +
      tokenArray('TETRAGRAPH_TOKENS', tetragraphTokens),
    derivedType('Tetragraph', 'TETRAGRAPH_TOKENS'),
    `// Every ISMCAT entity: ${merged.size} entries — the two groups above plus\n` +
      '// the FGI marker.\n' +
      `export type IsmcatEntity = ${quote(FGI_MARKER)} | Trigraph | Tetragraph\n`,
    deprecations('ISMCAT_DEPRECATED', 'IsmcatEntity', [...merged.values()]),
  ]
}

/** The label tables for both groups, plus the superset composed from them. */
const emitSharedLabels = (
  merged: ReadonlyMap<string, Term>,
  trigraphTokens: readonly string[],
  tetragraphTokens: readonly string[],
): string[] => {
  const term = (t: string): Term => merged.get(t) as Term
  return [
    describedBy(
      'TRIGRAPH_DESCRIPTIONS',
      'Trigraph',
      trigraphTokens.map((t) => term(t)),
    ),
    describedBy(
      'TETRAGRAPH_DESCRIPTIONS',
      'Tetragraph',
      tetragraphTokens.map((t) => term(t)),
    ),
    composedObject(
      'ISMCAT_DESCRIPTIONS',
      'IsmcatEntity',
      [term(FGI_MARKER)],
      ['TRIGRAPH_DESCRIPTIONS', 'TETRAGRAPH_DESCRIPTIONS'],
    ),
  ]
}

/** One vocabulary, expressed as a composition of the two shared lists. */
const emitVocabulary = (
  v: (typeof ISMCAT_VOCABULARIES)[number],
  trigraphTokens: readonly string[],
  tetragraphTokens: readonly string[],
): string[] => {
  const excluded = new Set([...v.excludeTrigraphs, ...v.lead])
  const composed = [
    ...v.lead,
    ...trigraphTokens.filter((t) => !excluded.has(t)),
    ...tetragraphTokens,
  ]

  assertComposition(
    v.cve,
    composed,
    literalsAndPatterns('ISMCAT', v.cve).literals.map((t) => t.value),
  )

  const union = unionFor(v, trigraphTokens)
  const blocks = [
    `// ${v.cve} — ${composed.length} terms\n// ${v.note}\nexport type ${v.type} = ${union}\n`,
    `export const ${v.const}_TOKENS: readonly ${v.type}[] = [\n` +
      v.lead.map((t) => `  ${quote(t)},\n`).join('') +
      trigraphSpread(excluded, trigraphTokens) +
      '  ...TETRAGRAPH_TOKENS,\n]\n',
  ]

  const patterns = literalsAndPatterns('ISMCAT', v.cve).patterns
  if (patterns.length > 0) {
    blocks.push(
      satisfiesArray(
        `${v.const}_PATTERNS`,
        'string',
        patterns.map((t) => t.value),
      ),
    )
  }

  return blocks
}

export const buildIsmcat = (): readonly string[] => {
  const tetragraphTokens = literalsAndPatterns('ISMCAT', ISMCAT_TETRAGRAPH_CVE).literals.map(
    (t) => t.value,
  )
  const isTetragraph = new Set(tetragraphTokens)

  const sources = [...ISMCAT_VOCABULARIES.map((v) => v.cve), ISMCAT_TETRAGRAPH_CVE]
  const merged = mergeEntities(sources)

  // A trigraph is any entity that is neither a tetragraph nor the FGI marker.
  // Sorted alphabetically, which is the order every CVE uses.
  const trigraphTokens = [...merged.keys()]
    .filter((t) => !isTetragraph.has(t) && t !== FGI_MARKER)
    .toSorted()

  const blocks = emitSharedGroups(merged, trigraphTokens, tetragraphTokens)

  for (const v of ISMCAT_VOCABULARIES) {
    blocks.push(...emitVocabulary(v, trigraphTokens, tetragraphTokens))
  }

  write('ismcat.ts', blocks)
  return emitSharedLabels(merged, trigraphTokens, tetragraphTokens)
}
