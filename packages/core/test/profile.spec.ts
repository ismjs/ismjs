import { describe, expect, it } from 'vitest'
import { REQUIRES } from '../src/generated/rules.ts'
import { US_CLASSIFICATION_TOKENS } from '../src/generated/vocab.ts'
import { IssueCode } from '../src/issue.ts'
import { canonicalize } from '../src/normalize.ts'
import { type Profile, atOrBelow, profileFor } from '../src/profile.ts'
import { validate } from '../src/validate.ts'

const usa = ['USA'] as const

const check = (input: Parameters<typeof canonicalize>[0], profile: Profile) =>
  validate(canonicalize(input), { profile }).filter((i) => i.code === IssueCode.OutsideProfile)

describe('classification ordering', () => {
  // Everything in this file depends on the register being ordered by
  // sensitivity, most sensitive first. If a DES release changes that order, a
  // ceiling derived from it gives the wrong answer and nothing else says so.
  it('lists classifications most sensitive first', () => {
    expect(US_CLASSIFICATION_TOKENS).toEqual(['TS', 'S', 'C', 'U'])
  })

  it('takes everything at or below the ceiling', () => {
    expect(atOrBelow('S')).toEqual(['S', 'C', 'U'])
    expect(atOrBelow('U')).toEqual(['U'])
    expect(atOrBelow('TS')).toEqual(['TS', 'S', 'C', 'U'])
  })
})

const deniedSci = (c: 'TS' | 'S' | 'C' | 'U'): number => {
  const r = profileFor(c).SCIcontrols
  return r === undefined || 'allow' in r ? 0 : r.deny.length
}

describe('profileFor', () => {
  it('restricts nothing at the top', () => {
    expect(profileFor('TS')).toEqual({ classification: { allow: ['TS', 'S', 'C', 'U'] } })
  })

  // Derived, not copied. `MVL` requires TOP SECRET (ISM-ID-00472), and so does
  // `TK-BLFH` (ISM-ID-00368). Neither is reachable at SECRET.
  it('denies tokens whose rules put them out of reach', () => {
    const secret = profileFor('S')
    expect(secret.SCIcontrols).toEqual({
      deny: ['TK-BLFH', 'MVL'],
      denyPatterns: ['^SI-G$', '^HCS-P-[A-Z0-9]{1,6}$', '^KLM-R-[A-Z]{3}$'],
    })
    expect(secret.classification).toEqual({ allow: ['S', 'C', 'U'] })
  })

  it.each(['SI-G', 'HCS-P-ALPHA', 'KLM-R-ABC'])(
    'denies pattern-triggered SCI expression %s below its required ceiling',
    (SCIcontrol) => {
      const issues = check(
        {
          classification: 'S',
          ownerProducer: usa,
          SCIcontrols: [SCIcontrol as 'SI-G'],
        },
        profileFor('S'),
      )
      expect(issues.map((issue) => issue.token)).toContain(SCIcontrol)
    },
  )

  it('enforces atomic-energy patterns only below their allowed ceiling', () => {
    const sigma = {
      classification: 'S' as const,
      ownerProducer: usa,
      atomicEnergyMarkings: ['RD-SG-14'] as const,
      disseminationControls: ['NF'] as const,
    }
    expect(check(sigma, profileFor('S'))).toEqual([])
    expect(
      check({ ...sigma, classification: 'C' }, profileFor('C')).map((issue) => issue.token),
    ).toContain('RD-SG-14')
  })

  it('denies more as the ceiling drops', () => {
    expect(deniedSci('TS')).toBe(0)
    expect(deniedSci('S')).toBeLessThan(deniedSci('C'))
    expect(deniedSci('C')).toBeLessThanOrEqual(deniedSci('U'))
  })

  // A profile narrows; it does not enumerate what ISM already permits. NOFORN
  // on an unclassified marking is ordinary, whatever a builder chooses to show.
  it('leaves unconstrained tokens alone', () => {
    const unclass = profileFor('U')
    expect(unclass.disseminationControls).toEqual({
      deny: ['OC', 'EYES', 'IMC', 'RS', 'RAWFISA'],
    })
    expect(unclass.nonICmarkings).toBeUndefined()
  })
})

describe('profileFor rule coverage', () => {
  it('carries every unreachable classification pattern from the harvested rules', () => {
    for (const ceiling of US_CLASSIFICATION_TOKENS) {
      const reachable = new Set(atOrBelow(ceiling))
      const expected = new Map<string, Set<string>>()
      for (const rule of REQUIRES) {
        if (
          rule.requires !== 'classification' ||
          rule.allowed.some((classification) => reachable.has(classification))
        ) {
          continue
        }
        const patterns = expected.get(rule.field) ?? new Set<string>()
        rule.patterns.forEach((pattern) => patterns.add(pattern))
        expected.set(rule.field, patterns)
      }

      for (const [field, patterns] of expected) {
        const restriction = profileFor(ceiling)[field as keyof Profile]
        expect(
          restriction !== undefined && 'deny' in restriction
            ? (restriction.denyPatterns ?? [])
            : [],
        ).toEqual([...patterns])
      }
    }
  })
})

describe('checking against a profile', () => {
  it('flags a token the ceiling puts out of reach', () => {
    const issues = check(
      {
        classification: 'S',
        ownerProducer: usa,
        SCIcontrols: ['MVL'],
        disseminationControls: ['NF'],
      },
      profileFor('S'),
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]?.token).toBe('MVL')
    // A profile is local policy, so it cites no ODNI rule.
    expect(issues[0]?.ruleId).toBeUndefined()
  })

  it('accepts a marking within the ceiling', () => {
    expect(
      check(
        {
          classification: 'S',
          ownerProducer: usa,
          SCIcontrols: ['SI'],
          disseminationControls: ['NF'],
        },
        profileFor('S'),
      ),
    ).toEqual([])
  })

  // The other direction, which a ceiling cannot derive: local accreditation.
  it('flags a compartment a site is not accredited for', () => {
    const site: Profile = { SCIcontrols: { allow: ['SI', 'SI-G'] } }
    const issues = check(
      {
        classification: 'TS',
        ownerProducer: usa,
        SCIcontrols: ['SI', 'SI-G', 'TK'],
        disseminationControls: ['NF'],
      },
      site,
    )
    expect(issues.map((i) => i.token)).toEqual(['TK'])
  })

  it('supports explicit pattern allowlists without changing literal profiles', () => {
    const site: Profile = {
      SCIcontrols: { allow: ['SI'], allowPatterns: ['^SI-G-[A-Z]{4}$'] },
    }
    expect(
      check(
        {
          classification: 'TS',
          ownerProducer: usa,
          SCIcontrols: ['SI', 'SI-G', 'SI-G-ABCD'],
        },
        site,
      ).map((issue) => issue.token),
    ).toEqual(['SI-G'])
  })

  it('does nothing when no profile is supplied', () => {
    const marking = canonicalize({
      classification: 'TS',
      ownerProducer: usa,
      SCIcontrols: ['MVL'],
      disseminationControls: ['NF'],
    })
    expect(validate(marking).filter((i) => i.code === IssueCode.OutsideProfile)).toEqual([])
  })
})
