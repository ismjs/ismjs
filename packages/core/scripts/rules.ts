/**
 * Harvests the data-driven Schematron rules into `src/generated/rules.ts`.
 *
 * ODNI ships 535 rule files. 398 have no abstract pattern: they are bespoke
 * XPath, and most are about Notices, NTK and the Rollup, which v1 does not
 * implement. The other 137 are instances of 27 reusable templates. Three kinds
 * of template can be checked against a Marking on its own:
 *
 *   MutuallyExclusiveAttributeValues            6   tokens that cannot co-occur
 *   ValidateTokenValuesExistenceInList (x4)    14   every token is in its register
 *   AttributeValueDeprecated{Error,Warning}    14   retired tokens, by date
 *
 * The other templates need something a Marking does not hold: a document, a
 * Notice element, or a compilation context. ADR-0001 puts those out of scope.
 * See docs/adr/0001-marking-is-the-string-expressible-projection.md.
 *
 * The ids come from the packages, not from a person. A DES update therefore
 * keeps each official ISM-ID attached to the correct field.
 *
 * Some bespoke rules also apply to a Marking on its own. `cross-field.ts` reads
 * the ones that fit a shape it knows, and `cross-field-tables.ts` writes them
 * out. `schematron.ts` gets the text out of the rule files for both.
 *
 * This file holds the template-driven tables, the rules whose logic is written
 * by hand in `src/written-rules.ts`, and the assembly.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ISM, write } from './cve.ts'
import { key, quote } from './emit.ts'
import { type Rule, fieldOf, readRules, tokenList } from './schematron.ts'
import { harvestCrossField } from './cross-field.ts'
import { emitForbids, emitPresence, emitRequires } from './cross-field-tables.ts'

/**
 * Four templates assert membership, not one. Two of them also test whether the
 * element contributes to a Rollup, and one of those two handles the ACCM prefix.
 *
 * That test is about the structure of a document. A Marking on its own has no
 * structure, so all four templates say the same thing here. Without them,
 * `SCIcontrols` and `nonICmarkings` would have no membership rule.
 */
const MEMBERSHIP_TEMPLATES = new Set([
  'ValidateTokenValuesExistenceInList',
  'ValidateTokenValuesExistenceInListWhenContributesToRollup',
  'ValidateTokenValuesExistenceInListWhenContributesToRollupACCM',
])

/** A plain register variable, as opposed to a list computed from another field. */
const SIMPLE_LIST = /^\$\w+List$/u

const emitExclusive = (rules: readonly Rule[]): string => {
  const exclusive = rules
    .filter((r) => r.template === 'MutuallyExclusiveAttributeValues')
    .flatMap((r) => {
      const field = fieldOf(r.params['attrValue'])
      const tokens = tokenList(r.params['mutuallyExclusiveTokenList'] ?? '')
      return field === undefined || tokens.length === 0 ? [] : [{ id: r.id, field, tokens }]
    })

  return (
    `// MutuallyExclusiveAttributeValues — ${exclusive.length} rules in the projection\n` +
    '/** Tokens that may not appear together. At most one of each list may be present. */\n' +
    'export const MUTUALLY_EXCLUSIVE = [\n' +
    exclusive
      .map(
        (r) =>
          `  { id: ${quote(r.id)}, field: ${quote(r.field)}, ` +
          `tokens: [${r.tokens.map((t) => quote(t)).join(', ')}] },`,
      )
      .join('\n') +
    '\n] as const satisfies readonly (FieldRule & { readonly tokens: readonly string[] })[]\n'
  )
}

const emitMembership = (rules: readonly Rule[]): string => {
  const membership = rules
    .filter((r) => MEMBERSHIP_TEMPLATES.has(r.template))
    // The list must be a plain register. ISM-ID-00377 uses this template with a
    // computed list: every owner-producer of a joint marking must appear in its
    // releasability list. That relates two fields instead of constraining one,
    // so it belongs with the bespoke rules.
    .filter((r) => SIMPLE_LIST.test(r.params['list'] ?? ''))
    .flatMap((r) => {
      const field = fieldOf(r.params['context'])
      return field === undefined ? [] : [{ id: r.id, field }]
    })
    .toSorted((a, b) => (a.field < b.field ? -1 : 1))

  return (
    `// Membership templates — ${membership.length} rules, one per field in the projection\n` +
    '/** Every token in the field must be a value its register admits. */\n' +
    'export const MEMBERSHIP = {\n' +
    membership.map((r) => `  ${key(r.field)}: ${quote(r.id)},`).join('\n') +
    '\n} as const satisfies Partial<Record<keyof Marking, string>>\n'
  )
}

const emitDeprecation = (rules: readonly Rule[]): string => {
  const deprecation = new Map<string, { error?: string; warning?: string }>()
  for (const rule of rules) {
    const severity =
      rule.template === 'AttributeValueDeprecatedError'
        ? 'error'
        : rule.template === 'AttributeValueDeprecatedWarning'
          ? 'warning'
          : undefined
    const field = fieldOf(`@ism:${rule.params['attrName'] ?? ''}`)
    if (severity === undefined || field === undefined) {
      continue
    }
    deprecation.set(field, { ...deprecation.get(field), [severity]: rule.id })
  }

  return (
    `// AttributeValueDeprecated{Error,Warning} — ${deprecation.size} fields in the projection\n` +
    '/**\n' +
    ' * The rule ids a deprecated token is reported under. Which of the two applies\n' +
    " * depends on the resource's creation date, not on the token: `dvf:deprecated`\n" +
    ' * reports an error once that date is *after* the deprecation and a warning\n' +
    ' * while it is on or before. Absent a date it reports neither.\n' +
    ' */\n' +
    'export const DEPRECATION = {\n' +
    [...deprecation]
      .toSorted((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(
        ([field, ids]) =>
          `  ${key(field)}: { error: ${quote(ids.error ?? '')}, warning: ${quote(ids.warning ?? '')} },`,
      )
      .join('\n') +
    '\n} as const satisfies Partial<\n' +
    '  Record<keyof Marking, { readonly error: string; readonly warning: string }>\n>\n'
  )
}

/**
 * The one constraint in the corpus that exists only in the Schematron.
 *
 * ACCM programme names are free text, so `CVEnumISMNonIC` cannot list them.
 * ISM-ID-00261 removes them from the register check and tests them against this
 * pattern. Read from the phase file, not copied, so a DES release that widens
 * the pattern widens this too.
 */
const emitAccmPattern = (): string => {
  const text = readFileSync(join(ISM, 'Schematron/ISM/ISM_XML-VALUECHECK-phase.xsl'), 'utf8')
  const pattern = /name="ACCMRegex" select="'([^']+)'"/u.exec(text)?.[1]
  if (pattern === undefined) {
    throw new Error('could not find ACCMRegex in ISM_XML-VALUECHECK-phase.xsl')
  }

  return (
    '/** ACCM programme names, which no CVE enumerates. From ISM-ID-00261. */\n' +
    `export const ACCM_PATTERN = ${quote(pattern)}\n`
  )
}

/**
 * Rules whose logic is written by hand. Their identity is not.
 *
 * These rules relate two fields instead of constraining one, so no template
 * holds them and `validate` implements them directly. The id and the official
 * wording still come from the corpus: if a listed rule leaves the specification,
 * this throws, and `validate` cannot report an id that no longer exists.
 *
 * ISM-ID-00486 says CUI excludes `nonICmarkings`. It is here, not in `REQUIRES`,
 * because it asserts that a field is absent. Every harvested shape asserts that
 * something is present.
 *
 * It is also the one rule whose subject the library must derive. The Schematron
 * keys on `compliesWith`, which no marking string holds, so `validate` keys on
 * the CUI categories. See docs/risks.md.
 */
const HAND_WRITTEN = [
  'ISM-ID-00099',
  'ISM-ID-00163',
  'ISM-ID-00214',
  'ISM-ID-00217',
  'ISM-ID-00319',
  'ISM-ID-00345',
  'ISM-ID-00377',
  'ISM-ID-00388',
  'ISM-ID-00486',
]

const emitHandWritten = (rules: readonly Rule[]): string => {
  const found = HAND_WRITTEN.map((id) => {
    const rule = rules.find((r) => r.id === id)
    if (rule === undefined) {
      throw new Error(`${id} is implemented by hand but no longer exists in the rule corpus`)
    }
    // A template instance holds its message in an `errMsg` param. A bespoke rule
    // holds it only as the text of the assert element. Both carry an
    // `[ISM-ID-…][Severity]` prefix and extra whitespace.
    //
    // Only that prefix is removed. An earlier version stripped every `[…]` and
    // took the token names with it: ISM-ID-00099 read "contains the token , then
    // the token must be the only value".
    //
    // Text after the first `<` is dropped. ISM-ID-00388 interpolates a
    // `<sch:value-of>` that names the offending tokens, which the Schematron
    // engine fills in and this cannot.
    const source = (rule.params['errMsg'] ?? rule.raw.message ?? '').split('<')[0] ?? ''
    const message = source
      .replaceAll(/\s+/gu, ' ')
      .replaceAll(/^'|'$/gu, '')
      .replace(/^\s*\[ISM-ID-\d+\]\s*\[\w+\]\s*/u, '')
      // A message that interpolated a value ends mid-sentence once it is cut.
      .replace(/[\s(]+$/u, '')
      .trim()
    if (message === '') {
      throw new Error(`${id} is implemented by hand but states no message`)
    }
    return [id, message] as const
  })

  return (
    `// Rules ${HAND_WRITTEN.join(', ')} need logic the harvested tables cannot express,\n` +
    '// so they are implemented in written-rules.ts. The wording is still the\n' +
    "// specification's.\n" +
    'export const HAND_WRITTEN_RULES = {\n' +
    found.map(([id, message]) => `  ${quote(id)}: ${quote(message)},`).join('\n') +
    '\n} as const\n'
  )
}

export const buildRules = (): void => {
  const rules = readRules()
  const crossField = harvestCrossField(rules)

  write('rules.ts', [
    "import type { Marking } from '../marking.ts'\n",
    '/**\n' +
      ' * The data-driven rules, harvested from the ODNI Schematron by\n' +
      ' * `scripts/rules.ts`. Each carries the official ISM-ID it came from.\n' +
      ' */\n' +
      'export type FieldRule = { readonly id: string; readonly field: keyof Marking }\n',
    emitExclusive(rules),
    emitMembership(rules),
    emitDeprecation(rules),
    emitRequires(crossField),
    emitPresence(crossField),
    emitForbids(crossField),
    emitHandWritten(rules),
    emitAccmPattern(),
  ])
}
