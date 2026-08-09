/**
 * Generates `src/generated/tetragraph.ts` from `TetragraphTaxonomy.xml`.
 *
 * A tetragraph names a coalition. Its membership is the entities it stands for.
 * `REL TO USA, FVEY` releases to five countries. ISM-ID-00377 must compare a
 * releasability list with an owner-producer list, which needs those five names.
 *
 * Not every tetragraph decomposes. `ism-func:getTetragraphMembership` expands
 * one only when `@decomposable` is `Yes` or `NA`. For any other value it returns
 * the token itself: `GCCH` is a real coalition whose membership is not published
 * here. A tetragraph that does not decompose is absent from the table, so a
 * lookup that finds nothing means the token stands only for itself.
 */
import { join } from 'node:path'
import { ISM, write } from './cve.ts'
import { key, quote } from './emit.ts'
import { attribute, findAll, readXml, textOf } from './xml.ts'

const TAXONOMY = 'Taxonomy/ISMCAT/TetragraphTaxonomy.xml'

/** `Yes` and `NA` decompose; `No` does not. Mirrors the reference XSL. */
const DECOMPOSES = new Set(['Yes', 'NA'])

export const buildTetragraph = (): void => {
  const doc = readXml(join(ISM, TAXONOMY))
  const records = findAll(doc, 'Tetragraph')
  if (records.length === 0) {
    throw new Error(`${TAXONOMY} yielded no tetragraphs`)
  }

  const rows: Array<readonly [string, readonly string[]]> = []

  for (const record of records) {
    const token = findAll(record, 'TetraToken').map((n) => textOf(n))[0]
    if (token === undefined || !DECOMPOSES.has(attribute(record, 'decomposable') ?? '')) {
      continue
    }

    // `Membership/*` holds countries, and in two records a nested organisation.
    // The reference joins every child, so both kinds are members.
    const members = [
      ...findAll(record, 'Country').map((n) => textOf(n)),
      ...findAll(record, 'Organization').map((n) => textOf(n)),
    ].filter((m) => m !== '')

    // A record with no members stands for itself. An absent entry says that
    // already.
    if (members.length > 0) {
      rows.push([token, members])
    }
  }

  const total = rows.reduce((n, [, members]) => n + members.length, 0)

  write('tetragraph.ts', [
    "import type { Tetragraph } from './ismcat.ts'\n",
    `// TetragraphTaxonomy.xml — ${rows.length} of ${records.length} tetragraphs decompose,\n` +
      `// ${total} memberships in total. A token absent here stands only for itself.\n` +
      'export const TETRAGRAPH_MEMBERSHIP = {\n' +
      rows
        .map(([token, members]) => `  ${key(token)}: [${members.map((m) => quote(m)).join(', ')}],`)
        .join('\n') +
      '\n} as const satisfies Readonly<Partial<Record<Tetragraph, readonly string[]>>>\n',
  ])
}
