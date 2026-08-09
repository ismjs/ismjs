import { describe, expect, it } from 'vitest'
import { HAND_WRITTEN_RULES } from '../src/generated/rules.ts'
import type { Issue } from '../src/issue.ts'
import type { MarkingInput } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'
import { validate } from '../src/validate.ts'

/**
 * The rules written out in `written-rules.ts`.
 *
 * Each says something no harvested table expresses: a position in a list, a
 * count of entries, a token derived from another token, a choice between three
 * conditions. The logic is written by hand, so it is the part most able to be
 * wrong, and none of it is reachable from the corpus alone.
 */
const check = (input: MarkingInput): readonly (string | undefined)[] =>
  validate(canonicalize(input)).map((i: Issue) => i.ruleId)

const usa = ['USA'] as const

const TRIGGERS = {
  'ISM-ID-00099': { classification: 'S', ownerProducer: ['FGI', 'GBR'] },
  'ISM-ID-00163': {
    classification: 'S',
    ownerProducer: usa,
    atomicEnergyMarkings: ['RD'],
    disseminationControls: ['NF'],
    nonUSControls: ['NATO-ATOMAL'],
  },
  'ISM-ID-00214': {
    classification: 'S',
    ownerProducer: usa,
    disseminationControls: ['REL'],
    releasableTo: ['AUS', 'GBR'],
  },
  'ISM-ID-00217': {
    classification: 'S',
    ownerProducer: usa,
    FGIsourceProtected: ['FGI', 'GBR'],
  },
  'ISM-ID-00319': {
    classification: 'S',
    ownerProducer: usa,
    disseminationControls: ['REL'],
    releasableTo: ['USA'],
  },
  'ISM-ID-00345': {
    classification: 'S',
    ownerProducer: usa,
    disseminationControls: ['EYES'],
    releasableTo: ['USA', 'DEU'],
  },
  'ISM-ID-00377': {
    classification: 'S',
    ownerProducer: ['USA', 'GBR'],
    joint: true,
    disseminationControls: ['REL'],
    releasableTo: ['USA'],
  },
  'ISM-ID-00388': {
    classification: 'TS',
    ownerProducer: usa,
    SCIcontrols: ['SI', 'SI-G-ABCD'],
    disseminationControls: ['OC'],
  },
  'ISM-ID-00486': {
    classification: 'U',
    ownerProducer: usa,
    cuiBasic: ['CMPRS'],
    nonICmarkings: ['XD'],
  },
} as const satisfies Record<keyof typeof HAND_WRITTEN_RULES, MarkingInput>

describe('hand-written rule dispatch', () => {
  it('runs every rule the generated inventory names', () => {
    for (const [id, input] of Object.entries(TRIGGERS)) {
      expect(check(input), id).toContain(id)
    }
  })
})

describe('ISM-ID-00099 — FGI ownership conceals the owner', () => {
  it('flags FGI beside a named owner', () => {
    expect(check(TRIGGERS['ISM-ID-00099'])).toContain('ISM-ID-00099')
  })

  it('accepts FGI on its own', () => {
    expect(check({ classification: 'S', ownerProducer: ['FGI'] })).not.toContain('ISM-ID-00099')
  })
})

describe('ISM-ID-00217 — the FGI marker excludes named sources', () => {
  it('flags the marker beside a country', () => {
    expect(check(TRIGGERS['ISM-ID-00217'])).toContain('ISM-ID-00217')
  })

  // The countries-only form is legal and deliberately lossy: concealing them is
  // the purpose of the field. Only the marker beside a country is contradictory.
  it('accepts a named source with no marker', () => {
    expect(
      check({ classification: 'S', ownerProducer: usa, FGIsourceProtected: ['GBR'] }),
    ).not.toContain('ISM-ID-00217')
  })
})

describe('ISM-ID-00163 — a non-US control needs a NATO source', () => {
  it('flags ATOMAL on a US-owned marking with no NATO anywhere', () => {
    expect(check(TRIGGERS['ISM-ID-00163'])).toContain('ISM-ID-00163')
  })

  it('accepts it when NATO is an open FGI source', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        FGIsourceOpen: ['NATO'],
        atomicEnergyMarkings: ['RD'],
        disseminationControls: ['NF'],
        nonUSControls: ['NATO-ATOMAL'],
      }),
    ).not.toContain('ISM-ID-00163')
  })

  it('accepts it when the source is concealed', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        FGIsourceProtected: ['FGI'],
        atomicEnergyMarkings: ['RD'],
        disseminationControls: ['NF'],
        nonUSControls: ['NATO-ATOMAL'],
      }),
    ).not.toContain('ISM-ID-00163')
  })
})

describe('ISM-ID-00214 and ISM-ID-00319 — the shape of a releasability list', () => {
  it('flags a list that names no USA', () => {
    expect(check(TRIGGERS['ISM-ID-00214'])).toContain('ISM-ID-00214')
  })

  // Canonical Order already puts the USA first, so ordering cannot fail here.
  // Only a list with no USA at all can.
  it('does not flag a list the ordering fixed', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        disseminationControls: ['REL'],
        releasableTo: ['GBR', 'USA'],
      }),
    ).not.toContain('ISM-ID-00214')
  })

  it('flags releasing to the USA alone', () => {
    expect(check(TRIGGERS['ISM-ID-00319'])).toContain('ISM-ID-00319')
  })
})

describe('ISM-ID-00345 — EYES ONLY is the Five Eyes', () => {
  it('flags a sixth country', () => {
    const issues = check({
      classification: 'S',
      ownerProducer: usa,
      disseminationControls: ['EYES'],
      releasableTo: ['USA', 'GBR', 'DEU'],
    })
    expect(issues).toContain('ISM-ID-00345')
  })

  it('accepts the five', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        disseminationControls: ['EYES'],
        releasableTo: ['USA', 'AUS', 'CAN', 'GBR', 'NZL'],
      }),
    ).not.toContain('ISM-ID-00345')
  })
})

describe('ISM-ID-00388 — a compartment names the control it hangs off', () => {
  it('flags a compartment whose control is missing', () => {
    expect(check(TRIGGERS['ISM-ID-00388'])).toContain('ISM-ID-00388')
  })

  it('accepts the full chain', () => {
    expect(
      check({
        classification: 'TS',
        ownerProducer: usa,
        SCIcontrols: ['SI', 'SI-G', 'SI-G-ABCD'],
        disseminationControls: ['OC'],
      }),
    ).not.toContain('ISM-ID-00388')
  })

  /**
   * The rule reads `-[A-Z]`, so it does not reach the atomic energy markings.
   * `RD-SG-14` hangs off `RD`, and `RD-SG` is not a token — requiring it would
   * demand a value no register holds.
   */
  it('leaves a SIGMA value alone', () => {
    expect(
      check({
        classification: 'S',
        ownerProducer: usa,
        atomicEnergyMarkings: ['RD', 'RD-SG-14'],
        disseminationControls: ['NF'],
      }),
    ).not.toContain('ISM-ID-00388')
  })
})

describe('the wording', () => {
  // The logic is written by hand. The identity is not: if a rule leaves the
  // specification, codegen throws rather than letting `validate` cite it.
  it('comes from the corpus, with the token names intact', () => {
    expect(HAND_WRITTEN_RULES['ISM-ID-00214']).toContain('[USA]')
    expect(HAND_WRITTEN_RULES['ISM-ID-00345']).toContain('[NZL]')
    // The `[ISM-ID-…][Error]` prefix is the one thing removed.
    for (const message of Object.values(HAND_WRITTEN_RULES)) {
      expect(message).not.toMatch(/^\[ISM-ID-/u)
    }
  })
})
