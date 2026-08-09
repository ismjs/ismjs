import { describe, expect, it } from 'vitest'
import { FORBIDS, MUTUALLY_EXCLUSIVE, REQUIRES } from '../src/generated/rules.ts'
import { IssueCode, Severity } from '../src/issue.ts'
import type { Issue } from '../src/issue.ts'
import type { MarkingInput } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'
import { validate } from '../src/validate.ts'

const check = (input: MarkingInput, createdOn?: string): readonly Issue[] =>
  validate(canonicalize(input), createdOn === undefined ? {} : { createdOn })

const ids = (issues: readonly Issue[]): readonly (string | undefined)[] =>
  issues.map((i) => i.ruleId)

const usa = ['USA'] as const

describe('validating a string', () => {
  // "Is this a legal marking?" is one question. Answering it takes two steps:
  // read the string, then check the rules.
  it('reads the string and checks the rules', () => {
    expect(validate('(S//NF) ')).toEqual([])
    expect(ids(validate('(TS//RD) '))).toEqual(['ISM-ID-00467'])
  })

  it('reports why a string could not be read, rather than pretending it checked', () => {
    const issues = validate('(S//NOT-A-TOKEN) ')
    expect(issues.map((i) => i.code)).toEqual([IssueCode.UnknownToken])
  })

  // Order alone must not stop the rules being checked, so the string form is
  // lenient. It still reports the order.
  it('reports non-canonical order without abandoning the check', () => {
    expect(validate('(S//DSEN/NF) ').map((i) => i.code)).toEqual([IssueCode.NotCanonical])
  })

  it('agrees with the field form', () => {
    expect(validate('(TS//RD) ')).toEqual(
      validate({ classification: 'TS', ownerProducer: usa, atomicEnergyMarkings: ['RD'] }),
    )
  })
})

describe('HVCO channels', () => {
  it('requires meaningful channels when HVCO is present', () => {
    for (const handleViaChannels of [undefined, '', '   ']) {
      const issues = validate({
        classification: 'S',
        ownerProducer: usa,
        secondBannerLine: ['HVCO'],
        ...(handleViaChannels === undefined ? {} : { handleViaChannels }),
      })
      expect(issues).toContainEqual(
        expect.objectContaining({
          code: IssueCode.Inconsistent,
          field: 'handleViaChannels',
        }),
      )
    }
  })

  it('rejects channels when HVCO is absent', () => {
    expect(
      validate({
        classification: 'S',
        ownerProducer: usa,
        secondBannerLine: ['ACPI'],
        handleViaChannels: 'ALPHA',
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: IssueCode.Inconsistent,
        field: 'handleViaChannels',
      }),
    )
  })

  it.each(['ALPHA/BRAVO', 'ALPHA|BRAVO', 'ALPHA\nBRAVO'])(
    'rejects channel text containing marking delimiters: %j',
    (handleViaChannels) => {
      expect(
        validate({
          classification: 'S',
          ownerProducer: usa,
          secondBannerLine: ['HVCO'],
          handleViaChannels,
        }),
      ).toContainEqual(
        expect.objectContaining({
          code: IssueCode.Inconsistent,
          field: 'handleViaChannels',
        }),
      )
    },
  )

  it.each([' ALPHA', 'ALPHA '])(
    'rejects non-canonical channel whitespace: %j',
    (handleViaChannels) => {
      expect(
        validate({
          classification: 'S',
          ownerProducer: usa,
          secondBannerLine: ['HVCO'],
          handleViaChannels,
        }),
      ).toContainEqual(
        expect.objectContaining({
          code: IssueCode.Inconsistent,
          field: 'handleViaChannels',
        }),
      )
    },
  )
})

describe('mutual exclusion', () => {
  // The headline mutual-exclusion rule.
  it('flags ISM-ID-00033 on REL and NF together', () => {
    const issues = check({
      classification: 'S',
      ownerProducer: usa,
      disseminationControls: ['REL', 'NF'],
      releasableTo: ['USA', 'GBR'],
    })

    expect(ids(issues)).toContain('ISM-ID-00033')
    expect(issues[0]?.code).toBe(IssueCode.MutuallyExclusive)
    expect(issues[0]?.severity).toBe(Severity.Error)
    expect(issues[0]?.field).toBe('disseminationControls')
  })

  it('allows either one alone', () => {
    expect(
      check({ classification: 'S', ownerProducer: usa, disseminationControls: ['NF'] }),
    ).toEqual([])
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        disseminationControls: ['REL'],
        releasableTo: ['USA', 'GBR'],
      }),
    ).toEqual([])
  })

  it('flags RD beside FRD under ISM-ID-00321', () => {
    const issues = check({
      classification: 'S',
      ownerProducer: usa,
      atomicEnergyMarkings: ['RD', 'FRD'],
      // Restricted Data requires NOFORN (ISM-ID-00467). Supplying it keeps this
      // assertion about mutual exclusion only.
      disseminationControls: ['NF'],
    })
    expect(ids(issues)).toEqual(['ISM-ID-00321'])
  })

  // A compartment is not the control it hangs off. `RD` beside `RD-CNWDI` is
  // ordinary, because the rule names bare tokens only.
  it('does not mistake a compartment for its control', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        atomicEnergyMarkings: ['RD', 'RD-CNWDI', 'RD-SG-14'],
        disseminationControls: ['NF'],
      }),
    ).toEqual([])
  })

  it('flags OC beside RELIDO under ISM-ID-00325', () => {
    const issues = check({
      classification: 'S',
      ownerProducer: usa,
      disseminationControls: ['OC', 'RELIDO'],
    })
    expect(ids(issues)).toContain('ISM-ID-00325')
  })

  it('carries every harvested rule, not a hand-picked few', () => {
    expect(MUTUALLY_EXCLUSIVE).toHaveLength(6)
    expect(new Set(MUTUALLY_EXCLUSIVE.map((r) => r.id)).size).toBe(6)
  })
})

describe('mutually exclusive non-IC markings', () => {
  it('flags exclusive non-IC markings', () => {
    // XD and ND each require NOFORN (ISM-ID-00313, ISM-ID-00314).
    const dissem = { disseminationControls: ['NF'] } as const
    expect(
      ids(
        check({ classification: 'S', ownerProducer: usa, nonICmarkings: ['XD', 'ND'], ...dissem }),
      ),
    ).toEqual(['ISM-ID-00038'])
    // No `NF` here. ISM-ID-00372 forbids it beside `LES-NF`, which are
    // incompatible with any other foreign disclosure marking.
    expect(
      ids(check({ classification: 'S', ownerProducer: usa, nonICmarkings: ['LES', 'LES-NF'] })),
    ).toEqual(['ISM-ID-00148'])
  })

  it('carries every harvested rule, not a hand-picked few', () => {
    expect(MUTUALLY_EXCLUSIVE).toHaveLength(6)
    expect(new Set(MUTUALLY_EXCLUSIVE.map((r) => r.id)).size).toBe(6)
  })
})

describe('cross-field requirements', () => {
  // The earlier implementation called these `clsf` and `yes`. They are one rule:
  // a token in one field requires a value in another.
  it('requires SI to be CONFIDENTIAL or above', () => {
    expect(ids(check({ classification: 'U', ownerProducer: usa, SCIcontrols: ['SI'] }))).toContain(
      'ISM-ID-00043',
    )
    expect(
      ids(
        check({
          classification: 'S',
          ownerProducer: usa,
          SCIcontrols: ['SI'],
          disseminationControls: ['NF'],
        }),
      ),
    ).not.toContain('ISM-ID-00043')
  })

  it('requires OC alongside OC-USGOV', () => {
    expect(
      ids(
        check({
          classification: 'S',
          ownerProducer: usa,
          disseminationControls: ['OC-USGOV'],
        }),
      ),
    ).toContain('ISM-ID-00302')
  })

  it('accepts a marking that satisfies the requirement', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        disseminationControls: ['OC', 'OC-USGOV'],
      }),
    ).toEqual([])
  })

  it('carries every harvested requirement', () => {
    expect(REQUIRES.length).toBeGreaterThanOrEqual(29)
    expect(new Set(REQUIRES.map((r) => r.id)).size).toBe(REQUIRES.length)
  })
})

describe('cross-field exclusions', () => {
  // The inverse of a requirement, and it has to be read as its own shape. The
  // token list inside a negated assert looks exactly like a requirement, and
  // ISM-ID-00372 was harvested that way and inverted for a time.
  it('flags a foreign disclosure marking beside LES-NF', () => {
    expect(
      ids(
        check({
          classification: 'S',
          ownerProducer: usa,
          nonICmarkings: ['LES-NF'],
          disseminationControls: ['NF'],
        }),
      ),
    ).toEqual(['ISM-ID-00372'])
  })

  it('accepts LES-NF on its own', () => {
    expect(check({ classification: 'S', ownerProducer: usa, nonICmarkings: ['LES-NF'] })).toEqual(
      [],
    )
  })

  // The guard against the inversion coming back: a rule that forbids tokens must
  // never appear in the table that requires them. The Set is widened to `string`
  // on purpose — without that, this does not compile, because the two tables
  // already have disjoint literal unions and the type checker says so. The
  // runtime check is here for the day the harvester stops emitting `as const`.
  it('never carries the same rule as a requirement and an exclusion', () => {
    const required = new Set<string>(REQUIRES.map((r) => r.id))
    expect(FORBIDS.filter((r) => required.has(r.id))).toEqual([])
  })
})

describe('field presence', () => {
  it('requires a releasableTo when REL is present', () => {
    expect(
      ids(check({ classification: 'S', ownerProducer: usa, disseminationControls: ['REL'] })),
    ).toContain('ISM-ID-00031')
  })

  // The other direction, which ODNI states as its own rule.
  it('forbids a releasableTo when REL is absent', () => {
    expect(
      ids(check({ classification: 'S', ownerProducer: usa, releasableTo: ['USA', 'GBR'] })),
    ).toContain('ISM-ID-00032')
  })

  it('accepts the pair together', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        disseminationControls: ['REL'],
        releasableTo: ['USA', 'GBR'],
      }),
    ).toEqual([])
  })
})

describe('requirements triggered by a pattern', () => {
  // `^RD-SG` fires on `RD-SG-14`. A literal token list cannot express that, and
  // 12 rules in the corpus need it.
  it('requires SECRET or above for a SIGMA value', () => {
    expect(
      ids(
        check({
          classification: 'C',
          ownerProducer: usa,
          atomicEnergyMarkings: ['RD', 'RD-SG-14'],
          disseminationControls: ['NF'],
        }),
      ),
    ).toContain('ISM-ID-00173')
  })

  it('accepts the same marking at SECRET', () => {
    expect(
      ids(
        check({
          classification: 'S',
          ownerProducer: usa,
          atomicEnergyMarkings: ['RD', 'RD-SG-14'],
          disseminationControls: ['NF'],
        }),
      ),
    ).not.toContain('ISM-ID-00173')
  })
})

describe('joint releasability (ISM-ID-00377)', () => {
  // The rule that needs coalition membership. A tetragraph can release to an
  // owner that the list does not name.
  it('accepts an owner covered by a coalition', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: ['USA', 'GBR'],
        joint: true,
        disseminationControls: ['REL'],
        releasableTo: ['USA', 'FVEY'],
      }),
    ).toEqual([])
  })

  it('flags an owner the marking is not released to', () => {
    const issues = check({
      classification: 'S',
      ownerProducer: ['USA', 'DEU'],
      joint: true,
      disseminationControls: ['REL'],
      releasableTo: ['USA', 'FVEY'],
    })
    expect(ids(issues)).toEqual(['ISM-ID-00377'])
    expect(issues[0]?.token).toBe('DEU')
    expect(issues[0]?.code).toBe(IssueCode.Inconsistent)
  })

  it('does not apply to a marking that is not joint', () => {
    expect(check({ classification: 'S', ownerProducer: ['USA'] })).toEqual([])
  })
})

describe('CUI excludes non-IC markings (ISM-ID-00486)', () => {
  // The rule that asserts a field is absent. No harvested shape says that. Its
  // real subject is `compliesWith`, which no marking string holds, so the CUI
  // categories stand in for it.
  it('flags a non-IC marking beside CUI Basic', () => {
    const issues = check({
      classification: 'U',
      ownerProducer: ['USA'],
      cuiBasic: ['CMPRS'],
      nonICmarkings: ['DS'],
    })
    expect(ids(issues)).toEqual(['ISM-ID-00486'])
    expect(issues[0]?.field).toBe('nonICmarkings')
    expect(issues[0]?.code).toBe(IssueCode.Inconsistent)
  })

  it('flags it beside CUI Specified too', () => {
    expect(
      ids(
        check({
          classification: 'U',
          ownerProducer: ['USA'],
          cuiSpecified: ['BUDG'],
          nonICmarkings: ['XD'],
        }),
      ),
    ).toContain('ISM-ID-00486')
  })

  it('leaves each one alone', () => {
    expect(check({ classification: 'U', ownerProducer: ['USA'], cuiBasic: ['CMPRS'] })).toEqual([])
    expect(check({ classification: 'U', ownerProducer: ['USA'], nonICmarkings: ['DS'] })).toEqual(
      [],
    )
  })

  it('does not depend on the classification', () => {
    // The Schematron keys on `compliesWith`, not on whether anything is
    // classified. A commingled Marking is caught as readily as a pure one.
    expect(
      ids(
        check({
          classification: 'S',
          ownerProducer: ['USA'],
          SCIcontrols: ['SI'],
          disseminationControls: ['NF'],
          cuiBasic: ['CMPRS'],
          nonICmarkings: ['XD'],
        }),
      ),
    ).toContain('ISM-ID-00486')
  })
})

describe('deprecation', () => {
  // AOSC was retired on 2005-12-12. The severity comes from the date of the
  // resource, not from the token. `dvf:deprecated` reports an error only when the
  // resource is newer than the retirement.
  const withAosc: MarkingInput = {
    classification: 'S',
    ownerProducer: usa,
    disseminationControls: ['REL'],
    releasableTo: ['USA', 'AOSC'],
  }

  it('warns while the resource predates the retirement', () => {
    const issues = check(withAosc, '2005-01-01')
    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe(Severity.Warning)
    expect(issues[0]?.ruleId).toBe('ISM-ID-00198')
    expect(issues[0]?.code).toBe(IssueCode.Deprecated)
    expect(issues[0]?.token).toBe('AOSC')
  })

  it('is an error once the resource postdates it', () => {
    const issues = check(withAosc, '2024-01-01')
    expect(issues[0]?.severity).toBe(Severity.Error)
    expect(issues[0]?.ruleId).toBe('ISM-ID-00199')
  })

  // The boundary the reference draws: `$curDate gt xs:date(@deprecated)`.
  it('is still a warning on the retirement date itself', () => {
    expect(check(withAosc, '2005-12-12')[0]?.severity).toBe(Severity.Warning)
  })

  it('reports nothing without a date, as the reference does', () => {
    expect(check(withAosc)).toEqual([])
  })
})

describe('vocabulary membership', () => {
  // `parse` cannot check these. It reads a rendered string and cannot know the
  // character class of the register, so this suite is the only check.
  it('rejects a NATO sub-organisation the register would not admit', () => {
    const issues = check({
      classification: 'S',
      ownerProducer: usa,
      disseminationControls: ['REL'],
      releasableTo: ['USA', 'NATO:123'],
    })
    expect(ids(issues)).toEqual(['ISM-ID-00265'])
  })

  it('accepts one it would', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        disseminationControls: ['REL'],
        releasableTo: ['USA', 'NATO:Partnership_For_Peace'],
      }),
    ).toEqual([])
  })

  it('holds ACCM programme names to the Schematron pattern', () => {
    expect(
      ids(check({ classification: 'S', ownerProducer: usa, nonICmarkings: ['ACCM-lower_case'] })),
    ).toEqual(['ISM-ID-00261'])
    expect(
      check({ classification: 'S', ownerProducer: usa, nonICmarkings: ['ACCM-TEA_LEAF'] }),
    ).toEqual([])
  })

  // The recorded relaxation of ISM-ID-00267. Compartments are programme names,
  // and the public register does not list them, so the stem is checked instead.
  // TOP SECRET and ORCON because `SI-G` requires both, under ISM-ID-00044 and
  // ISM-ID-00045. The compartment is the subject here, not the classification.
  it('accepts an SCI compartment hanging off a registered control', () => {
    expect(
      check({
        classification: 'TS',
        ownerProducer: usa,
        SCIcontrols: ['SI', 'SI-G', 'SI-G-ABCD'],
        disseminationControls: ['OC'],
      }),
    ).toEqual([])
  })

  // Typed code cannot reach the other half of that rule. `SciExpression` admits
  // a free compartment but not a free control, so the type rejects it. This is
  // the only way to assert that.
  it('refuses an unregistered control outright', () => {
    check({
      classification: 'S',
      ownerProducer: usa,
      // @ts-expect-error ZZZ is not a registered SCI control
      SCIcontrols: ['ZZZ-1'],
    })
  })
})
