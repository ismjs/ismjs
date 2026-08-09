import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEPRECATION,
  FIELD_PRESENCE,
  FORBIDS,
  HAND_WRITTEN_RULES,
  MEMBERSHIP,
  MUTUALLY_EXCLUSIVE,
  REQUIRES,
} from '../src/generated/rules.ts'

const root = resolve(import.meta.dirname, '../../..')

const implementedRuleIds = new Set([
  ...MUTUALLY_EXCLUSIVE.map((rule) => rule.id),
  ...Object.values(MEMBERSHIP),
  ...Object.values(DEPRECATION).flatMap(({ error, warning }) => [error, warning]),
  ...REQUIRES.map((rule) => rule.id),
  ...FIELD_PRESENCE.map((rule) => rule.id),
  ...FORBIDS.map((rule) => rule.id),
  ...Object.keys(HAND_WRITTEN_RULES),
])

describe('published validation scope', () => {
  it('pins both public claims to the generated unique ISM-ID count', () => {
    const count = implementedRuleIds.size
    expect(count).toBe(109)
    expect(readFileSync(resolve(root, 'README.md'), 'utf8')).toContain(
      `validate\` applies ${count} of the 535 ODNI rules`,
    )
    const roadmap = readFileSync(resolve(root, 'docs/roadmap.md'), 'utf8')
    expect(roadmap).toContain(`validate\` implements ${count} of ODNI's 535 rules`)
  })

  it('publishes exact identities separately from asserted losses', () => {
    const readme = readFileSync(resolve(root, 'README.md'), 'utf8')
    expect(readme).toContain('Exact round-trip identity        | **266 / 272 renderings**')
    expect(readme).toContain('Asserted deliberate loss         | **6 / 272 renderings**')
  })
})
