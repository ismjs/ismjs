/**
 * Reading the ODNI Schematron rule files.
 *
 * 535 files, each one `sch:pattern` with an id. A rule is either an instance of
 * an abstract template, which states its parameters, or bespoke XPath, which
 * states a context and an assert. `rules.ts` reads the first kind and
 * `cross-field.ts` the second.
 *
 * Nothing here decides what a rule means. It only gets the text out of the file
 * and names the field a rule is about.
 */
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { join } from 'node:path'
import { ISM } from './cve.ts'

/**
 * The ISM attributes a Marking holds. ADR-0001 leaves everything else outside
 * the projection; see docs/adr/0001-marking-is-the-string-expressible-projection.md.
 */
const MARKING_FIELDS = new Set([
  'classification',
  'ownerProducer',
  'SCIcontrols',
  'atomicEnergyMarkings',
  'disseminationControls',
  'releasableTo',
  'displayOnlyTo',
  'FGIsourceOpen',
  'FGIsourceProtected',
  'nonICmarkings',
  'nonUSControls',
  'cuiBasic',
  'cuiSpecified',
  'secondBannerLine',
])

export type Rule = {
  id: string
  template: string
  params: Readonly<Record<string, string>>
  /**
   * The XPath of a bespoke rule, which has no parameters, and the text of its
   * assert element. That text is the only place a bespoke rule states its
   * message. A template instance states it in an `errMsg` param.
   */
  raw: {
    context: string | undefined
    assert: string | undefined
    message: string | undefined
  }
}

export const readRules = (): readonly Rule[] =>
  globSync(join(ISM, 'Schematron/ISM/Rules/**/ISM_ID_*.sch'))
    .map((file) => {
      const text = readFileSync(file, 'utf8')
      return {
        id: /sch:pattern[^>]*id="([^"]+)"/u.exec(text)?.[1] ?? '',
        template: /is-a="([^"]+)"/u.exec(text)?.[1] ?? '',
        params: Object.fromEntries(
          [...text.matchAll(/<sch:param name="([^"]+)" value="([\s\S]*?)"\/>/gu)].map((m) => [
            m[1] ?? '',
            (m[2] ?? '').replaceAll(/\s+/gu, ' ').trim(),
          ]),
        ),
        raw: {
          context: /<sch:rule[^>]*context="([^"]*)"/u.exec(text)?.[1],
          assert: /<sch:assert[^>]*test="([^"]*)"/u.exec(text)?.[1],
          message: /<sch:assert[^>]*>([\s\S]*?)<\/sch:assert>/u.exec(text)?.[1],
        },
      }
    })
    .filter((rule) => rule.id !== '')
    .toSorted((a, b) => (a.id < b.id ? -1 : 1))

/** `('REL', 'EYES', 'NF')` -> `['REL', 'EYES', 'NF']`. */
export const tokenList = (value: string): readonly string[] =>
  [...value.matchAll(/'([^']*)'/gu)].map((m) => m[1] ?? '')

export const quotedList = (value: string): string[] => [...tokenList(value)]

/** `@ism:disseminationControls` or `*[@ism:cuiBasic]` -> the field name. */
export const fieldOf = (value: string | undefined): string | undefined => {
  const name = /@ism:(\w+)/u.exec(value ?? '')?.[1]
  return name !== undefined && MARKING_FIELDS.has(name) ? name : undefined
}
