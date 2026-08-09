import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type NonEmpty, canonicalTokens, isCanonical, stemOf } from '../src/canonical.ts'
import { OWNER_PRODUCER_TOKENS } from '../src/generated/ismcat.ts'
import { DISSEM_ORDER_CUI, DISSEM_ORDER_IC } from '../src/generated/order.ts'
import {
  ATOMIC_ENERGY_MARKING_TOKENS,
  DISSEM_CONTROL_TOKENS,
  SCI_CONTROL_TOKENS,
} from '../src/generated/vocab.ts'
import { MarkingKind, dissemOrder, markingKind } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'
import { UNCLASSIFIED } from '../src/tokens.ts'

// The type system cannot see fast-check's `minLength`, so a non-empty list is
// built structurally instead of asserted.
const nonEmpty = <T>(head: T, tail: readonly T[]): NonEmpty<T> => [head, ...tail]
const owner = fc.constantFrom('USA' as const, 'GBR' as const)

describe('ancestors are kept, not superseded', () => {
  // Rendering emits only the last hyphen-separated part of a token and builds
  // the rest from the ancestors, so the ancestors must survive canonicalisation.
  // `SI SI-G SI-G-ABCD` renders as `SI-G ABCD`. Without `SI` it renders as
  // `-G ABCD`.
  it('keeps a control alongside the compartments hanging off it', () => {
    expect(canonicalTokens(['SI', 'SI-G'], SCI_CONTROL_TOKENS)).toEqual(['SI', 'SI-G'])
    expect(canonicalTokens(['HCS', 'HCS-P'], SCI_CONTROL_TOKENS)).toEqual(['HCS', 'HCS-P'])
    expect(canonicalTokens(['SI', 'SI-G', 'SI-G-ABCD'], SCI_CONTROL_TOKENS)).toEqual([
      'SI',
      'SI-G',
      'SI-G-ABCD',
    ])
  })

  it('keeps an unregistered stem that only carries compartments', () => {
    expect(canonicalTokens(['RSV', 'RSV-ABC', 'RSV-DEF'], SCI_CONTROL_TOKENS)).toEqual([
      'RSV',
      'RSV-ABC',
      'RSV-DEF',
    ])
  })

  // The input of the AEAOrder vector. Every SIGMA value is a registered token.
  // `RD` and `FRD` stay, because their SIGMAs render from those stems.
  it('orders atomic energy markings as the register does', () => {
    expect(
      canonicalTokens(
        ['FRD-SG-20', 'FRD-SG-14', 'RD-CNWDI', 'RD-SG-20', 'RD-SG-14', 'RD', 'FRD'],
        ATOMIC_ENERGY_MARKING_TOKENS,
      ),
    ).toEqual(['RD', 'RD-CNWDI', 'RD-SG-14', 'RD-SG-20', 'FRD', 'FRD-SG-14', 'FRD-SG-20'])
  })
})

describe('ordering', () => {
  it('sorts owner-producers by the register, not alphabetically by input', () => {
    expect(canonicalTokens(['GBR', 'DEU'], OWNER_PRODUCER_TOKENS)).toEqual(['DEU', 'GBR'])
  })

  it('keeps a control and its compartments together as one run', () => {
    expect(
      canonicalTokens(['TK', 'SI-G-ACDE', 'SI-G-ABCD', 'SI', 'SI-G'], SCI_CONTROL_TOKENS),
    ).toEqual(['SI', 'SI-G', 'SI-G-ABCD', 'SI-G-ACDE', 'TK'])
  })

  it('deduplicates', () => {
    expect(canonicalTokens(['NF', 'NF', 'NF'], DISSEM_ORDER_IC)).toEqual(['NF'])
  })

  it('orders dissemination controls by the governing vocabulary', () => {
    expect(canonicalTokens(['DSEN', 'NF'], DISSEM_ORDER_IC)).toEqual(['NF', 'DSEN'])
    // The same two tokens, the other way round, under the CUI vocabulary.
    expect(canonicalTokens(['NF', 'DL_ONLY'], DISSEM_ORDER_CUI)).toEqual(['DL_ONLY', 'NF'])
  })

  it('places unrecognised tokens last rather than dropping them', () => {
    expect(canonicalTokens(['ZZZ', 'NF'], DISSEM_ORDER_IC)).toEqual(['NF', 'ZZZ'])
  })
})

describe('stemOf', () => {
  it('resolves to the most specific control that admits the compartment', () => {
    expect(stemOf('SI-G-ABCD', SCI_CONTROL_TOKENS)).toBe('SI-G')
    expect(stemOf('SI-G', SCI_CONTROL_TOKENS)).toBe('SI-G')
    expect(stemOf('RSV-ABC', SCI_CONTROL_TOKENS)).toBe('RSV')
  })

  it('treats an unknown token as its own stem', () => {
    expect(stemOf('ZZZ-1', SCI_CONTROL_TOKENS)).toBe('ZZZ-1')
  })
})

describe('Marking Kind', () => {
  const usa = ['USA'] as const

  it('is classic IC when there is no CUI', () => {
    expect(markingKind({ classification: 'S', ownerProducer: usa })).toBe(MarkingKind.Ic)
  })

  it('is pure CUI when nothing classic is present and the marking is UNCLASSIFIED', () => {
    expect(
      markingKind({
        classification: UNCLASSIFIED,
        ownerProducer: usa,
        cuiSpecified: ['AIV'],
        disseminationControls: ['NF'],
      }),
    ).toBe(MarkingKind.Cui)
  })

  it('is Commingled once a classification above U is involved', () => {
    expect(markingKind({ classification: 'S', ownerProducer: usa, cuiSpecified: ['AIV'] })).toBe(
      MarkingKind.Commingled,
    )
  })

  // FISA is a classic dissemination control and the CUI vocabulary has no place
  // for it, so FISA alone makes the Marking Commingled.
  it('is Commingled when a dissemination control is not a CUI one', () => {
    expect(
      markingKind({
        classification: UNCLASSIFIED,
        ownerProducer: usa,
        cuiSpecified: ['AIV'],
        disseminationControls: ['NF', 'FISA'],
      }),
    ).toBe(MarkingKind.Commingled)
  })

  it('selects a different dissemination vocabulary per kind', () => {
    expect(dissemOrder(MarkingKind.Ic)).not.toEqual(dissemOrder(MarkingKind.Cui))
    expect(dissemOrder(MarkingKind.Cui)).not.toEqual(dissemOrder(MarkingKind.Commingled))
  })
})

describe('canonicalize', () => {
  it('canonicalises every multi-valued field', () => {
    const marking = canonicalize({
      classification: 'TS',
      ownerProducer: ['GBR', 'DEU'],
      SCIcontrols: ['TK', 'SI', 'SI-G'],
      disseminationControls: ['DSEN', 'NF'],
    })

    expect(marking.ownerProducer).toEqual(['DEU', 'GBR'])
    expect(marking.SCIcontrols).toEqual(['SI', 'SI-G', 'TK'])
    expect(marking.disseminationControls).toEqual(['NF', 'DSEN'])
  })

  // Nothing is displaced here either. `OC-USGOV` consumes `OC` when the marking
  // renders, but the attribute set holds both. ISM-ID-00302 requires both, and
  // two corpus vectors supply both. `format` does the collapse.
  it('keeps OC alongside OC-USGOV', () => {
    const marking = canonicalize({
      classification: 'S',
      ownerProducer: ['USA'],
      disseminationControls: ['OC-USGOV', 'OC', 'NF'],
    })
    expect(marking.disseminationControls).toEqual(['OC', 'OC-USGOV', 'NF'])
  })
})

describe('canonicalize field handling', () => {
  it('omits absent and empty fields rather than storing undefined', () => {
    const marking = canonicalize({
      classification: 'U',
      ownerProducer: ['USA'],
      releasableTo: [],
    })

    expect(Object.keys(marking)).toEqual(['classification', 'ownerProducer'])
    expect('releasableTo' in marking).toBe(false)
  })

  it('orders dissemination controls by the kind it derives', () => {
    const cui = canonicalize({
      classification: 'U',
      ownerProducer: ['USA'],
      cuiBasic: ['LEI'],
      disseminationControls: ['NF', 'DL_ONLY'],
    })
    expect(cui.disseminationControls).toEqual(['DL_ONLY', 'NF'])

    const classic = canonicalize({
      classification: 'S',
      ownerProducer: ['USA'],
      disseminationControls: ['DSEN', 'NF'],
    })
    expect(classic.disseminationControls).toEqual(['NF', 'DSEN'])
  })
})

describe('properties', () => {
  const tokens = fc.constantFrom(...DISSEM_CONTROL_TOKENS)

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.array(tokens), (values) => {
        const once = canonicalTokens(values, DISSEM_ORDER_IC)
        const twice = canonicalTokens(once, DISSEM_ORDER_IC)
        expect(twice).toEqual(once)
      }),
    )
  })

  it('produces a list that reports itself canonical', () => {
    fc.assert(
      fc.property(fc.array(tokens), (values) => {
        expect(isCanonical(canonicalTokens(values, DISSEM_ORDER_IC), DISSEM_ORDER_IC)).toBe(true)
      }),
    )
  })

  it('does not depend on the order values are supplied in', () => {
    fc.assert(
      fc.property(fc.array(tokens), (values) => {
        const shuffled = values.toReversed()
        expect(canonicalTokens(shuffled, DISSEM_ORDER_IC)).toEqual(
          canonicalTokens(values, DISSEM_ORDER_IC),
        )
      }),
    )
  })

  it('never invents or duplicates a token', () => {
    fc.assert(
      fc.property(fc.array(tokens), (values) => {
        const result = canonicalTokens(values, DISSEM_ORDER_IC)
        expect(new Set(result).size).toBe(result.length)
        for (const token of result) {
          expect(values).toContain(token)
        }
      }),
    )
  })
})

describe('Marking properties', () => {
  const tokens = fc.constantFrom(...DISSEM_CONTROL_TOKENS)

  const owners = fc.tuple(owner, fc.array(owner)).map(([head, tail]) => nonEmpty(head, tail))

  it('canonicalises a whole Marking idempotently', () => {
    fc.assert(
      fc.property(
        fc.record({
          classification: fc.constantFrom('U' as const, 'C' as const, 'S' as const),
          ownerProducer: owners,
          disseminationControls: fc.array(tokens),
        }),
        (input) => {
          const once = canonicalize(input)
          // A canonicalised Marking is valid input to `canonicalize`. That is
          // part of the contract, so canonicalising again must typecheck.
          expect(canonicalize(once)).toEqual(once)
        },
      ),
    )
  })
})
