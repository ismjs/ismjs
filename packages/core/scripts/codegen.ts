/**
 * Generates `src/generated/` from the ODNI packages vendored under `references/`.
 *
 * No files in `src/generated/` are written by hand, and the output is committed.
 * See docs/adr/0003-vocabularies-are-generated-and-committed.md. CI runs this
 * again and fails if the working tree changes.
 *
 *   bun run codegen
 */
import { join } from 'node:path'
import { ISM, ROLLUP, cve, literalsAndPatterns, write } from './cve.ts'
import {
  deprecations,
  derivedType,
  describedBy,
  key,
  quote,
  satisfiesArray,
  tokenArray,
} from './emit.ts'
import { buildCui } from './cui.ts'
import { buildIsmcat } from './ismcat.ts'
import { ORDERS, VOCABULARIES } from './manifest.ts'
import { buildRules } from './rules.ts'
import { buildTetragraph } from './tetragraph.ts'
import { attribute, findAll, readXml, textOf } from './xml.ts'

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

/**
 * `SECOND_BANNER_LINE_DESCRIPTIONS` goes into both modules. It is not shared
 * between them.
 *
 * It is rendering data that reads like a label: a second banner line is spelled
 * out from its description. The codec needs it, and a UI that lists labels wants
 * it. To share it, a third module would have to sit between the two entry
 * points, and it would save 240 bytes. Both copies come from one CVE in one run,
 * and each is checked against the same union, so they cannot disagree.
 */
const SHARED_WITH_LABELS = new Set(['SECOND_BANNER_LINE'])

const buildVocab = (): readonly string[] => {
  const blocks: string[] = []
  const labels: string[] = []

  for (const v of VOCABULARIES) {
    const { literals, patterns } = literalsAndPatterns(v.group, v.cve)
    const tokensConst = `${v.const}_TOKENS`

    const note =
      patterns.length === 0
        ? `// ${v.cve} — ${literals.length} literal terms`
        : `// ${v.cve} — ${literals.length} literal terms, ` +
          `${patterns.length} pattern term(s) held separately below`

    blocks.push(
      `${note}\n${tokenArray(
        tokensConst,
        literals.map((t) => t.value),
      )}`,
      derivedType(v.type, tokensConst),
      deprecations(`${v.const}_DEPRECATED`, v.type, literals),
    )

    const table = describedBy(`${v.const}_DESCRIPTIONS`, v.type, literals)
    labels.push(table)
    if (SHARED_WITH_LABELS.has(v.const)) {
      blocks.push(table)
    }

    if (patterns.length > 0) {
      blocks.push(
        satisfiesArray(
          `${v.const}_PATTERNS`,
          'string',
          patterns.map((t) => t.value),
        ),
      )
    }
  }

  write('vocab.ts', blocks)
  return labels
}

// ---------------------------------------------------------------------------
// Canonical order
// ---------------------------------------------------------------------------

const buildOrder = (): void => {
  const blocks: string[] = [
    `import type { DissemControl } from './vocab.ts'\n`,
    `// Canonical Order for a Marking's multi-valued fields. Order is defined by the\n` +
      `// governing vocabulary, which for dissemination controls varies by Marking Kind.\n` +
      `// The categories these sit between are fixed by DoDM 5200.01-V2, Encl 4 §1.b.\n`,
  ]

  for (const o of ORDERS) {
    const values = cve('ISM', o.cve).map((t) => t.value)
    // `satisfies` makes "every ordered token is a real dissemination control" a
    // compile-time check instead of a test.
    blocks.push(`// ${o.cve} — ${o.note}\n${satisfiesArray(o.const, 'DissemControl', values)}`)
  }

  write('order.ts', blocks)
}

// ---------------------------------------------------------------------------
// Banner spelling
// ---------------------------------------------------------------------------

/**
 * 19 entries in three groups, each mapping a portion token to its banner
 * spelling. The reference XSL reads them with `//BannerMap[@portion=$name]`,
 * which matches across the whole document, so the groups can be flattened.
 *
 * A token that is absent renders unchanged. `FISA` stays `FISA`, and so does
 * `FOUO`. CVE descriptions are never used for rendering.
 */
const buildBanner = (): void => {
  const doc = readXml(join(ROLLUP, 'XSL/ISM/BannerMapping.xml'))
  const entries = findAll(doc, 'BannerMap')
    .map((node) => [attribute(node, 'portion'), textOf(node)] as const)
    .filter((pair): pair is readonly [string, string] => pair[0] !== undefined)

  if (entries.length === 0) {
    throw new Error('BannerMapping.xml yielded no entries')
  }

  const body = entries.map(([p, b]) => `  ${key(p)}: ${quote(b)},`).join('\n')

  write('banner.ts', [
    `// BannerMapping.xml — ${entries.length} entries.\n` +
      `// A token absent from this table renders verbatim in a Banner Line.\n` +
      `export const BANNER_SPELLING: Readonly<Record<string, string>> = {\n${body}\n}\n`,
  ])
}

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

/**
 * The label tables. They have their own module, published as a subpath.
 *
 * They are display data, and nothing in the codec reads them. The single-file
 * bundle cannot tree-shake, so keeping the labels apart lets that bundle carry
 * the codec alone. A consumer who wants labels asks for them.
 *
 * Each table is `satisfies Readonly<Record<Token, string>>`. A description that
 * is missing, or one for a token that no longer exists, fails the build.
 */
const buildDescriptions = (labels: readonly string[]): void => {
  const imports = [
    "import type { CuiCategory } from './cui.ts'",
    "import type { IsmcatEntity, Tetragraph, Trigraph } from './ismcat.ts'",
    'import type {',
    '  AnyClassification,',
    '  AtomicEnergyMarking,',
    '  DissemControl,',
    '  NonIcMarking,',
    '  NonUsControl,',
    '  SciControl,',
    '  SecondBannerLine,',
    '  UsClassification,',
    "} from './vocab.ts'",
    '',
  ].join('\n')

  write('descriptions.ts', [
    imports,
    '// Display labels only. Nothing in the codec reads them.\n',
    ...labels,
  ])
}

// ---------------------------------------------------------------------------
// Spec version
// ---------------------------------------------------------------------------

/** Read straight from the packages so the constant cannot drift from them. */
const buildSpecVersion = (): void => {
  const doc = readXml(join(ISM, 'CVE/ISM/CVEnumISMDissem.xml'))
  const root = findAll(doc, 'CVE')[0]
  if (root === undefined) {
    throw new Error('CVEnumISMDissem.xml has no CVE root')
  }

  const spec = attribute(root, 'specVersion')
  const des = attribute(root, 'DESVersion')
  const ismcat = attribute(root, 'ISMCATCESVersion')
  if (spec === undefined || des === undefined || ismcat === undefined) {
    throw new Error('could not read spec versions from the vendored packages')
  }

  write('spec-version.ts', [
    [
      '/** The ODNI specification version this library encodes. */',
      'export const SPEC_VERSION = {',
      `  spec: ${quote(spec)},`,
      `  des: ${quote(des)},`,
      `  ismcat: ${quote(ismcat)},`,
      '} as const',
      '',
    ].join('\n'),
  ])
}

// ---------------------------------------------------------------------------

console.log('generating src/generated/')
buildSpecVersion()
const labels = [...buildVocab(), ...buildIsmcat(), ...buildCui()]
buildOrder()
buildBanner()
buildRules()
buildTetragraph()
buildDescriptions(labels)
console.log('done')
