import { describe, expect, it } from 'vitest'
import { RenderMode, format } from '../src/format.ts'
import { parse } from '../src/parse.ts'
import { validate } from '../src/validate.ts'
import portions from './fixtures/valid-portions.json' with { type: 'json' }

/**
 * Portion marks that are correct.
 *
 * Every other suite here shows that the library reacts to something: a rule
 * fires, a construct renders, a malformed string is refused. None of them can
 * show the opposite. The official corpus cannot show it either, because 30 of
 * its vectors break rules for good reason: a rendering test is minimal by
 * design, and `(TS//RD)` is the smallest input that exercises atomic energy
 * rendering.
 *
 * A validator that reported good markings would therefore pass every other
 * suite. These 111 are the check on that. They are not derived from this
 * implementation and not from the official corpus, so agreement with them is
 * independent evidence.
 */
const values = portions as readonly string[]

describe('markings that should be clean', () => {
  it('parses every one', () => {
    const failed = values.filter((v) => !parse(`(${v}) `).ok)
    expect(failed).toEqual([])
  })

  it('re-renders every one exactly', () => {
    const differ = values.flatMap((v) => {
      const result = parse(`(${v}) `)
      if (!result.ok) {
        return []
      }
      const back = format(result.marking, RenderMode.Portion)
      return back === `(${v}) ` ? [] : [`${v} -> ${back.trim()}`]
    })
    expect(differ).toEqual([])
  })

  /**
   * The reason this file exists. `validate` is useful only if it stays quiet
   * about markings that are correct, and no other suite here can show that.
   */
  it('reports nothing against any of them', () => {
    const noisy = values.flatMap((v) => {
      const issues = validate(`(${v}) `)
      return issues.length === 0
        ? []
        : [`${v}: ${issues.map((i) => i.ruleId ?? i.code).join(', ')}`]
    })
    expect(noisy).toEqual([])
  })

  /**
   * None reports `not-canonical`. The check above already covers this, but the
   * claim is different and independent: the order these are written in is the
   * order this library sorts them into.
   */
  it('finds every one already in Canonical Order', () => {
    const reordered = values.filter((v) => !parse(`(${v}) `, { strict: true }).ok)
    expect(reordered).toEqual([])
  })
})
