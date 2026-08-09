import { describe, expect, it } from 'vitest'
import { combineEntities, decomposes, expandEntities, membersOf } from '../src/entities.ts'
import { TETRAGRAPH_MEMBERSHIP } from '../src/generated/tetragraph.ts'

describe('expandEntities', () => {
  it('replaces a coalition with the entities it stands for', () => {
    expect(expandEntities(['FVEY'])).toEqual(['AUS', 'CAN', 'NZL', 'GBR', 'USA'])
  })

  it('deduplicates against entities already named', () => {
    expect(expandEntities(['USA', 'FVEY'])).toEqual(['USA', 'AUS', 'CAN', 'NZL', 'GBR'])
  })

  // `ism-func:getTetragraphMembership` returns the token itself when the
  // taxonomy says it does not decompose. It does not expand to nothing.
  it('leaves a coalition that does not publish its membership', () => {
    expect(decomposes('GCCH')).toBe(false)
    expect(expandEntities(['GCCH'])).toEqual(['GCCH'])
    expect(membersOf('GCCH')).toEqual(['GCCH'])
  })

  it('leaves a plain country alone', () => {
    expect(expandEntities(['DEU'])).toEqual(['DEU'])
  })
})

describe('combineEntities', () => {
  it('is the inverse of expansion over a fully covered coalition', () => {
    expect(combineEntities(expandEntities(['FVEY']))).toEqual(['FVEY'])
  })

  // The relation is not symmetric. Part of a coalition is not the coalition.
  it('leaves a coalition that is not fully present', () => {
    expect(combineEntities(['AUS', 'CAN'])).toEqual(['AUS', 'CAN'])
  })

  it('keeps entities that belong to no coalition', () => {
    expect(combineEntities(['DEU', 'AUS', 'CAN', 'NZL', 'GBR', 'USA'])).toEqual(['DEU', 'FVEY'])
  })

  it('prefers the larger coalition when both are covered', () => {
    // ACGU is FVEY without New Zealand, so a full FVEY covers both.
    const both = combineEntities(expandEntities(['FVEY']))
    expect(both).toEqual(['FVEY'])
  })
})

describe('the taxonomy', () => {
  // An absent entry means the token does not decompose. An empty list would be
  // ambiguous.
  it('never holds an empty membership', () => {
    for (const [token, members] of Object.entries(TETRAGRAPH_MEMBERSHIP)) {
      expect(members.length, token).toBeGreaterThan(0)
    }
  })

  it('covers the coalitions releasability lists actually use', () => {
    for (const t of ['FVEY', 'ACGU', 'TEYE', 'NATO']) {
      expect(decomposes(t) || membersOf(t)).toBeTruthy()
    }
  })
})
