import { describe, expect, it } from 'vitest'
import { rejoinEntities, spellEntity, unspellEntity } from '../src/entity-spelling.ts'

describe('entity spelling', () => {
  it('spells and unspells registered separators in both directions', () => {
    expect(spellEntity('AUSTRALIA_GROUP')).toBe('AUSTRALIA GROUP')
    expect(unspellEntity('AUSTRALIA GROUP')).toBe('AUSTRALIA_GROUP')

    expect(spellEntity('NATO:ALLIED_COMMAND')).toBe('NATO ALLIED COMMAND')
    expect(unspellEntity('NATO ALLIED COMMAND')).toBe('NATO:ALLIED_COMMAND')
  })

  it('rejoins registered and patterned multi-word entities in a list', () => {
    expect(rejoinEntities(['AUSTRALIA', 'GROUP', 'NATO', 'NAC', 'DEU'])).toEqual([
      'AUSTRALIA_GROUP',
      'NATO:NAC',
      'DEU',
    ])
  })
})
