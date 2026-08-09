/**
 * Generates `src/generated/cui.ts`.
 *
 * CUI Basic and CUI Specified are two designations over one registry of
 * categories, not two vocabularies. 27 of the 123 categories carry both: one
 * authority handles the category as Basic, another as Specified. The CVEs give
 * those 27 the same description.
 *
 * A description is about 300 characters. Writing the shared ones twice was the
 * largest duplication in the generated output. This emits one table and two
 * token lists.
 */
import { literalsAndPatterns, write } from './cve.ts'
import { type Term, deprecations, derivedType, describedBy, tokenArray } from './emit.ts'
import { CUI_VOCABULARIES } from './manifest.ts'

/** One table of categories, asserting the two designations never disagree. */
const mergeCategories = (): {
  merged: Map<string, Term>
  perVocabulary: Map<string, string[]>
} => {
  const merged = new Map<string, Term>()
  const perVocabulary = new Map<string, string[]>()

  for (const v of CUI_VOCABULARIES) {
    const { literals } = literalsAndPatterns('ISM', v.cve)
    perVocabulary.set(
      v.cve,
      literals.map((t) => t.value),
    )

    for (const term of literals) {
      const existing = merged.get(term.value)
      if (existing === undefined) {
        merged.set(term.value, term)
      } else if (
        existing.description !== term.description ||
        existing.deprecated !== term.deprecated
      ) {
        throw new Error(
          `CUI designations disagree about ${term.value}: ` +
            `${JSON.stringify(existing)} vs ${JSON.stringify(term)} (in ${v.cve})`,
        )
      }
    }
  }

  return { merged, perVocabulary }
}

export const buildCui = (): readonly string[] => {
  const { merged, perVocabulary } = mergeCategories()
  const categories = [...merged.values()]

  const blocks: string[] = []

  for (const v of CUI_VOCABULARIES) {
    const tokens = perVocabulary.get(v.cve) ?? []
    blocks.push(
      `// ${v.cve} — ${tokens.length} categories\n// ${v.note}\n` +
        tokenArray(`${v.const}_TOKENS`, tokens),
      derivedType(v.type, `${v.const}_TOKENS`),
    )
  }

  // Every category carries at least one designation. The union of the two is
  // therefore the whole registry, and no category is written a third time. A
  // type costs nothing at runtime. An array of every category did.
  blocks.push(
    `// Every CUI category: ${merged.size} across both designations, ` +
      `${categories.length - (perVocabulary.get(CUI_VOCABULARIES[0]?.cve ?? '')?.length ?? 0)} ` +
      'of them Specified-only.\n' +
      `export type CuiCategory = ${CUI_VOCABULARIES.map((v) => v.type).join(' | ')}\n`,
    deprecations('CUI_DEPRECATED', 'CuiCategory', categories),
  )

  write('cui.ts', blocks)

  return [
    `// One table for both designations: ${merged.size} categories, each described once.\n` +
      describedBy('CUI_DESCRIPTIONS', 'CuiCategory', categories),
  ]
}
