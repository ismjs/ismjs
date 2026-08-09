import { describe, expect, it } from 'vitest'
import type { Vector } from '../scripts/corpus.ts'
import { RenderMode, format } from '../src/format.ts'
import vectors from './fixtures/vectors.json' with { type: 'json' }
import { toMarking } from './vector.ts'

const active = (vectors as readonly Vector[]).filter((v) => v.skip === undefined)

type Failure = {
  readonly label: string
  readonly mode: RenderMode
  readonly expected: string
  readonly actual: string
}

const run = (): { passes: number; total: number; failures: Failure[] } => {
  const failures: Failure[] = []
  let passes = 0
  let total = 0

  for (const vector of active) {
    const marking = toMarking(vector)
    if (marking === undefined) {
      continue
    }
    const cases = [
      [RenderMode.Portion, vector.expected.portion],
      [RenderMode.Banner, vector.expected.banner],
    ] as const

    for (const [mode, expected] of cases) {
      if (expected === undefined) {
        continue
      }
      total += 1
      let actual: string
      try {
        actual = format(marking, mode)
      } catch (error) {
        actual = `threw: ${String(error)}`
      }
      if (actual === expected) {
        passes += 1
      } else {
        failures.push({ label: vector.label, mode, expected, actual })
      }
    }
  }

  return { passes, total, failures }
}

const result = run()

describe('format against the official vectors', () => {
  it(`renders ${active.length} vectors (${result.passes}/${result.total} renderings correct)`, () => {
    // Failures are listed rather than counted, so a regression names itself.
    const report = result.failures
      .map(
        (f) =>
          `  ${f.mode.padEnd(7)} ${f.label}\n    want ${JSON.stringify(f.expected)}\n    got  ${JSON.stringify(f.actual)}`,
      )
      .join('\n')

    expect(result.failures, `\n${report}\n`).toEqual([])
  })
})
