/**
 * Harvests golden test vectors from ODNI's own XSpec suites into
 * `test/fixtures/vectors.json`.
 *
 * Each XSpec scenario carries an ISM attribute set and asserts the Portion Mark
 * and Banner Line it renders to. This is the same contract as the library, so
 * the tests measure output against ODNI's expectations:
 *
 *   <x:scenario label="DSEN-NF-Checkorder">
 *     <x:context>
 *       <sampleAttributes ism:classification="TS" ism:ownerProducer="USA"
 *                         ism:disseminationControls="DSEN NF"/>
 *     </x:context>
 *     <x:scenario label="…-ism:portionmark">
 *       <x:context mode="ism:portionmark"/>
 *       <x:expect test=".='(TS//NF/DSEN) '"/>
 *
 * Vectors outside the v1 scope are kept and tagged with a `skip` reason. This
 * makes the gap countable. See docs/roadmap.md.
 *
 *   bun run harvest
 */
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { type Vector, SkipReason, type SkipReason as SkipReasonValue } from './corpus.ts'
import { ROLLUP } from './cve.ts'
import { type XmlNode, attribute, readXml } from './xml.ts'

const XSPEC = join(ROLLUP, 'XSPEC')
const OUT = join(import.meta.dirname, '..', 'test', 'fixtures')

// ---------------------------------------------------------------------------

const asArray = (node: unknown): XmlNode[] => {
  if (node === undefined || node === null) {
    return []
  }
  return (Array.isArray(node) ? node : [node]) as XmlNode[]
}

/**
 * The element inside an `x:context` that carries the ISM attributes. Its tag
 * name changes between suites, so find it by its classification attribute.
 */
const sampleAttributes = (context: XmlNode): Readonly<Record<string, string>> | undefined => {
  for (const value of Object.values(context)) {
    for (const child of asArray(value)) {
      if (attribute(child, 'classification') === undefined) {
        continue
      }
      const attributes: Record<string, string> = {}
      for (const [name, raw] of Object.entries(child)) {
        if (name.startsWith('@')) {
          attributes[name.slice(1)] = String(raw)
        }
      }
      return attributes
    }
  }
  return undefined
}

/** `test=".='…'"` — the expected string, with any inner spacing preserved. */
const expectedString = (test: string | undefined): string | undefined => {
  if (test === undefined) {
    return undefined
  }
  const match = /^\s*\.\s*=\s*'([\s\S]*)'\s*$/u.exec(test)
  return match?.[1]
}

/** Reads the portion/banner expectations off a vector scenario's children. */
const expectations = (scenario: XmlNode): Vector['expected'] => {
  const expected: { portion?: string; banner?: string } = {}

  for (const child of asArray(scenario['scenario'])) {
    const mode = asArray(child['context'])
      .map((c) => attribute(c, 'mode'))
      .find((m) => m !== undefined)
    if (mode === undefined) {
      continue
    }

    for (const expectation of asArray(child['expect'])) {
      const value = expectedString(attribute(expectation, 'test'))
      if (value === undefined) {
        continue
      }
      if (mode.includes('portionmark')) {
        expected.portion = value
      } else if (mode.includes('banner')) {
        expected.banner = value
      }
    }
  }

  return expected
}

/**
 * v1 covers classic IC and CUI Markings owned by the USA or by foreign
 * governments. Special Access Programs and NATO ownership are deferred.
 */
const skipReason = (attributes: Readonly<Record<string, string>>): SkipReasonValue | undefined => {
  if (attributes['SARIdentifier'] !== undefined) {
    return SkipReason.Sap
  }
  if ((attributes['ownerProducer'] ?? '').includes('NATO')) {
    return SkipReason.Nato
  }
  return undefined
}

const collect = (node: unknown, source: string, into: Vector[]): void => {
  for (const scenario of asArray((node as XmlNode)['scenario'])) {
    const attributes = asArray(scenario['context'])
      .map((c) => sampleAttributes(c))
      .find((a) => a !== undefined)

    if (attributes !== undefined) {
      const expected = expectations(scenario)
      if (expected.portion !== undefined || expected.banner !== undefined) {
        const reason = skipReason(attributes)
        into.push({
          label: String(scenario['@label'] ?? ''),
          source,
          attributes,
          expected,
          ...(reason === undefined ? {} : { skip: reason }),
        })
      }
    }

    // Scenarios nest. A vector scenario can sit inside another one.
    collect(scenario, source, into)
  }
}

// ---------------------------------------------------------------------------

/** Regenerate the committed golden corpus from the vendored XSpec suites. */
export const harvest = (): void => {
  const files = readdirSync(XSPEC, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.xspec'))
    .toSorted()

  const vectors: Vector[] = []
  for (const file of files) {
    const source = relative(XSPEC, join(XSPEC, file)).split(sep).join('/')
    // Scenarios hang off `x:description`. The parsed root also holds the XML
    // declaration, so go down one level before the walk.
    const description = readXml(join(XSPEC, file))['description']
    if (description === undefined) {
      throw new Error(`${source}: no x:description root`)
    }
    collect(description, source, vectors)
  }

  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, 'vectors.json'), `${JSON.stringify(vectors, null, 2)}\n`, 'utf8')

  const skipped = vectors.filter((v) => v.skip !== undefined)
  const both = vectors.filter(
    (v) => v.expected.portion !== undefined && v.expected.banner !== undefined,
  )

  console.log(`harvested ${vectors.length} vectors from ${files.length} XSpec files`)
  console.log(`  with both portion mark and banner line: ${both.length}`)
  for (const reason of Object.values(SkipReason)) {
    console.log(`  skipped (${reason}): ${skipped.filter((v) => v.skip === reason).length}`)
  }
  console.log(`  v1 target: ${vectors.length - skipped.length}`)
}

if (import.meta.main) {
  harvest()
}
