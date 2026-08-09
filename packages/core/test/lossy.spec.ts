import { describe, expect, it } from 'vitest'
import { RenderMode, format } from '../src/format.ts'
import type { MarkingInput } from '../src/marking.ts'
import { canonicalize } from '../src/normalize.ts'
import { parse } from '../src/parse.ts'
import { lossy } from './lossy.ts'

const cases: readonly [string, MarkingInput, RenderMode][] = [
  [
    'FGIsourceProtected names a source the marking exists to conceal',
    { classification: 'S', ownerProducer: ['USA'], FGIsourceProtected: ['DEU'] },
    RenderMode.Banner,
  ],
  [
    'FGI is only marked on a US-controlled document',
    { classification: 'S', ownerProducer: ['DEU'], FGIsourceOpen: ['GBR'] },
    RenderMode.Banner,
  ],
  [
    'a bare NATO in an FGI list cannot be told from a NATO sub-organisation',
    { classification: 'S', ownerProducer: ['USA'], FGIsourceOpen: ['NATO', 'RSMA'] },
    RenderMode.Banner,
  ],
  [
    'a non-US control has no host segment to be carried on',
    { classification: 'S', ownerProducer: ['USA'], nonUSControls: ['NATO-ATOMAL'] },
    RenderMode.Banner,
  ],
  [
    'a Portion Mark carries no second banner line',
    { classification: 'S', ownerProducer: ['USA'], secondBannerLine: ['ACPI'] },
    RenderMode.Portion,
  ],
]

describe('the five documented round-trip losses', () => {
  it.each(cases)('asserts %s', (reason, input, mode) => {
    const marking = canonicalize(input)
    const result = parse(format(marking, mode))

    expect(lossy(marking, mode)).toBe(reason)
    expect(result.ok && result.marking).not.toEqual(marking)
  })
})
