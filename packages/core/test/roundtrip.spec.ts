import { describe, expect, it } from 'vitest'
import type { Vector } from '../scripts/corpus.ts'
import { RenderMode, format } from '../src/format.ts'
import { parse } from '../src/parse.ts'
import { lossy } from './lossy.ts'
import { toMarking } from './vector.ts'
import vectors from './fixtures/vectors.json' with { type: 'json' }

const active = (vectors as readonly Vector[]).filter((v) => v.skip === undefined)

type Failure = {
  readonly label: string
  readonly mode: RenderMode
  readonly rendered: string
  readonly detail: string
}

/** The law compares Markings themselves, not strings rendered a second time. */
const sameMarking = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const report = (failures: readonly Failure[]) =>
  failures
    .map(
      (failure) =>
        `  ${failure.mode.padEnd(7)} ${failure.label}\n    ${JSON.stringify(failure.rendered)}\n    ${failure.detail}`,
    )
    .join('\n')

const run = () => {
  const identityFailures: Failure[] = []
  const lossFailures: Failure[] = []
  let exactIdentities = 0
  let expectedLosses = 0
  let total = 0

  for (const vector of active) {
    const marking = toMarking(vector)
    if (marking === undefined) {
      continue
    }

    for (const mode of [RenderMode.Portion, RenderMode.Banner] as const) {
      const expected =
        mode === RenderMode.Portion ? vector.expected.portion : vector.expected.banner
      if (expected === undefined) {
        continue
      }
      total += 1

      const rendered = format(marking, mode)
      const result = parse(rendered)
      const loss = lossy(marking, mode)

      if (!result.ok) {
        // A Marking that cannot round-trip can fail in two ways: the string is
        // unreadable, or it reads back different. Both are the expected loss.
        if (loss !== undefined) {
          expectedLosses += 1
          continue
        }
        identityFailures.push({
          label: vector.label,
          mode,
          rendered,
          detail: result.issues.map((i) => i.message).join('; '),
        })
        continue
      }

      const identical = sameMarking(result.marking, marking)

      if (loss !== undefined) {
        // Assert the loss instead of skipping it. If one of these begins to
        // round-trip, remove the exception. Do not leave it in place.
        if (identical) {
          lossFailures.push({
            label: vector.label,
            mode,
            rendered,
            detail: `expected to be lossy (${loss}) but round-tripped`,
          })
        } else {
          expectedLosses += 1
        }
        continue
      }

      if (identical) {
        exactIdentities += 1
      } else {
        identityFailures.push({
          label: vector.label,
          mode,
          rendered,
          detail: `\n      want ${JSON.stringify(marking)}\n      got  ${JSON.stringify(result.marking)}`,
        })
      }
    }
  }

  return { exactIdentities, expectedLosses, total, identityFailures, lossFailures }
}

const result = run()

describe('round trip', () => {
  it(`reports ${result.exactIdentities}/${result.total} exact identities`, () => {
    expect(result.exactIdentities).toBe(266)
    expect(result.identityFailures, `\n${report(result.identityFailures)}\n`).toEqual([])
  })

  it(`asserts ${result.expectedLosses}/${result.total} deliberate losses separately`, () => {
    expect(result.expectedLosses).toBe(6)
    expect(result.lossFailures, `\n${report(result.lossFailures)}\n`).toEqual([])
    expect(result.exactIdentities + result.expectedLosses).toBe(result.total)
  })
})

describe('the markings that defeated an earlier implementation', () => {
  // Each of these broke an experimental lexer-implementation.
  // It matched tokens character by character, so `OC` took the front of `OC-USGOV`.
  const cases = [
    '(S//OC-USGOV/NF) ',
    '(TS//SI-G//OC/NF) ',
    '(S//RD-CNWDI) ',
    '(C//FGI POL//NF) ',
    '(S//REL TO USA, DEU) ',
    '(S//SBU-NF) ',
  ]

  for (const marking of cases) {
    it(`parses ${marking.trim()}`, () => {
      const parsed = parse(marking)
      expect(parsed.ok, parsed.ok ? '' : parsed.issues.map((i) => i.message).join('; ')).toBe(true)
      if (parsed.ok) {
        // And renders back to exactly what it read.
        expect(format(parsed.marking, RenderMode.Portion)).toBe(marking)
      }
    })
  }
})
