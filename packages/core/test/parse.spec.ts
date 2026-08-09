import { describe, expect, it } from 'vitest'
import { IssueCode } from '../src/issue.ts'
import { parse } from '../src/parse.ts'
import { validate } from '../src/validate.ts'

describe('complete marking syntax', () => {
  it.each(['(S) trailing', '(S////NF) ', '(S//NF//) ', '(S//CUI) '])(
    'rejects malformed input %j in strict, lenient, and validation paths',
    (input) => {
      for (const strict of [true, false]) {
        const result = parse(input, { strict })
        expect(result.ok).toBe(false)
        expect(result.issues.map((issue) => issue.code)).toContain(IssueCode.Malformed)
      }

      expect(validate(input).map((issue) => issue.code)).toContain(IssueCode.Malformed)
    },
  )

  it('preserves the intentional leading ownership separator', () => {
    expect(parse('(//GBR S) ').ok).toBe(true)
  })

  it('rejects HVCO without meaningful channel text', () => {
    const result = parse('S|HANDLE VIA CHANNELS ONLY')
    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: IssueCode.Malformed,
        field: 'handleViaChannels',
      }),
    )
  })
})

describe('required order at the parser boundary', () => {
  const cases = [
    ['(//GBR DEU S) ', 'ownerProducer'],
    ['(TS//TK/SI) ', 'SCIcontrols'],
    ['(TS//FRD/RD) ', 'atomicEnergyMarkings'],
    ['(S//REL TO GBR, USA) ', 'releasableTo'],
    ['(S//FGI GBR DEU) ', 'FGIsourceOpen'],
    ['(TS//SSI/DS) ', 'nonICmarkings'],
    ['(TS//TK/BALK/BOHEMIA) ', 'nonUSControls'],
    ['(CUI//JURY/CMPRS) ', 'cuiBasic'],
    ['S|SOURCE SELECTION SENSITIVE/ATTORNEY-CLIENT PRIVILEGED INFO', 'secondBannerLine'],
  ] as const

  it.each(cases)('reports and repairs out-of-order %s', (input, field) => {
    const strict = parse(input)
    expect(strict.ok).toBe(false)
    expect(strict.issues).toContainEqual(
      expect.objectContaining({
        code: IssueCode.NotCanonical,
        field,
        severity: 'error',
      }),
    )

    const lenient = parse(input, { strict: false })
    expect(lenient.ok).toBe(true)
    expect(lenient.issues).toContainEqual(
      expect.objectContaining({
        code: IssueCode.NotCanonical,
        field,
        severity: 'warning',
      }),
    )
  })

  it('reports duplicates before canonicalization removes them', () => {
    const strict = parse('(S//NF/NF) ')
    expect(strict.ok).toBe(false)
    expect(strict.issues).toContainEqual(
      expect.objectContaining({
        code: IssueCode.NotCanonical,
        field: 'disseminationControls',
      }),
    )

    const lenient = parse('(S//NF/NF) ', { strict: false })
    expect(lenient.ok).toBe(true)
    if (lenient.ok) {
      expect(lenient.marking.disseminationControls).toEqual(['NF'])
    }
  })
})
