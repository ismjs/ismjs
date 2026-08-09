import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { literalsAndPatterns, patternValues } from '../scripts/cve.ts'
import { readXml } from '../scripts/xml.ts'

describe('XSD pattern arbitration', () => {
  it('fails when the authority XSD cannot be read', () => {
    expect(() => patternValues('ISM', 'CVEnumMissingFromAuthority')).toThrow(
      /CVEnumMissingFromAuthority\.xsd/u,
    )
  })

  it('keeps a known pattern term out of its literal token list', () => {
    const terms = literalsAndPatterns('ISMCAT', 'CVEnumISMCATOwnerProducer')
    const pattern = 'NATO:[a-zA-Z\\-_]{1,256}'

    expect(terms.patterns.map((term) => term.value)).toContain(pattern)
    expect(terms.literals.map((term) => term.value)).not.toContain(pattern)
  })

  it('rejects malformed authority XML with its file name', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ismjs-codegen-'))
    const file = join(directory, 'malformed.xsd')
    writeFileSync(file, '<xsd:schema><xsd:pattern></xsd:schema>', 'utf8')

    try {
      expect(() => readXml(file)).toThrow(/malformed\.xsd/u)
    } finally {
      rmSync(directory, { recursive: true })
    }
  })
})
