import { describe, expect, it } from 'vitest'
import { SkipReason, type Vector } from '../scripts/corpus.ts'
import vectors from './fixtures/vectors.json' with { type: 'json' }

const corpus = vectors as readonly Vector[]

const active = corpus.filter((v) => v.skip === undefined)
const skipped = corpus.filter((v) => v.skip !== undefined)

/**
 * The shape of the golden corpus, pinned.
 *
 * These test the harvester and the corpus, not the codec. Every other suite
 * measures the library against these vectors, so a fault in the harvester would
 * make the target smaller without making a test fail.
 */
describe('golden corpus', () => {
  it('harvests every scenario ODNI provides', () => {
    expect(corpus).toHaveLength(189)
  })

  it('targets 139 vectors for v1', () => {
    expect(active).toHaveLength(139)
  })

  it('accounts for every skipped vector with a reason', () => {
    expect(skipped.filter((v) => v.skip === SkipReason.Sap)).toHaveLength(30)
    expect(skipped.filter((v) => v.skip === SkipReason.Nato)).toHaveLength(20)
    expect(skipped).toHaveLength(50)
  })

  it('carries at least one expectation for every vector', () => {
    const empty = corpus.filter(
      (v) => v.expected.portion === undefined && v.expected.banner === undefined,
    )
    expect(empty).toEqual([])
  })

  it('carries both renderings for all but four vectors', () => {
    const both = corpus.filter(
      (v) => v.expected.portion !== undefined && v.expected.banner !== undefined,
    )
    expect(both).toHaveLength(185)
  })
})

describe('corpus contents', () => {
  it('preserves the trailing space a portion mark renders with', () => {
    const vector = active.find((v) => v.label === 'DSEN-NF-Checkorder')
    expect(vector?.expected.portion).toBe('(TS//NF/DSEN) ')
    expect(vector?.expected.banner).toBe('TOP SECRET//NOFORN/DEA SENSITIVE')
  })

  // Attribute values are whitespace-separated token lists, and the source
  // documents wrap and indent them freely. XML attribute-value normalisation
  // turns newlines into spaces; nothing else may be altered.
  it('keeps attribute values verbatim apart from XML normalisation', () => {
    const wrapped = corpus.filter((v) =>
      Object.values(v.attributes).some((a) => /[\t\r\n]/u.test(a)),
    )
    expect(wrapped, 'no attribute may retain a raw tab or newline').toEqual([])

    const padded = corpus.filter((v) => Object.values(v.attributes).some((a) => a !== a.trim()))
    expect(padded.length, 'source padding is preserved, not trimmed').toBeGreaterThan(0)
  })

  it('never marks a vector both deferred and active', () => {
    for (const vector of corpus) {
      if (vector.skip === undefined) {
        expect(vector.attributes['SARIdentifier']).toBeUndefined()
        expect(vector.attributes['ownerProducer'] ?? '').not.toContain('NATO')
      }
    }
  })

  it('exercises the attributes v1 has to render', () => {
    const used = new Set(active.flatMap((v) => Object.keys(v.attributes)))
    for (const attribute of [
      'classification',
      'ownerProducer',
      'disseminationControls',
      'releasableTo',
      'SCIcontrols',
      'atomicEnergyMarkings',
      'FGIsourceOpen',
      'nonICmarkings',
      'nonUSControls',
      'displayOnlyTo',
    ]) {
      expect(used, `${attribute} should appear in the v1 corpus`).toContain(attribute)
    }
  })
})
