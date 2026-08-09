import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BANNER_SPELLING } from '../src/generated/banner.ts'
import {
  FGI_OPEN_ENTITY_TOKENS,
  FGI_PROTECTED_ENTITY_TOKENS,
  ISMCAT_DEPRECATED,
  OWNER_PRODUCER_PATTERNS,
  OWNER_PRODUCER_TOKENS,
  REL_TO_ENTITY_TOKENS,
  TETRAGRAPH_TOKENS,
  TRIGRAPH_TOKENS,
} from '../src/generated/ismcat.ts'
import {
  DISSEM_ORDER_COMMINGLED,
  DISSEM_ORDER_CUI,
  DISSEM_ORDER_IC,
} from '../src/generated/order.ts'
import { SPEC_VERSION } from '../src/generated/spec-version.ts'
import { CUI_BASIC_TOKENS, CUI_SPECIFIED_TOKENS } from '../src/generated/cui.ts'
import { CUI_DESCRIPTIONS, ISMCAT_DESCRIPTIONS } from '../src/generated/descriptions.ts'
import {
  DISSEM_CONTROL_TOKENS,
  NON_US_CONTROL_TOKENS,
  SCI_CONTROL_TOKENS,
} from '../src/generated/vocab.ts'

const CVE =
  'references/ISM-Public-Convenience-2022-DEC-Public-Light/ISM/CVE/ISM/CVEnumISMDissem.xml'

const attr = (file: string, name: string): string | undefined =>
  new RegExp(`${name}="([^"]*)"`, 'u').exec(readFileSync(file, 'utf8'))?.[1]

describe('SPEC_VERSION', () => {
  it('matches the versions declared by the vendored packages', () => {
    expect(SPEC_VERSION.des).toBe(attr(CVE, 'ism:DESVersion'))
    expect(SPEC_VERSION.ismcat).toBe(attr(CVE, 'ism:ISMCATCESVersion'))
    expect(SPEC_VERSION.spec).toBe(attr(CVE, 'specVersion'))
  })
})

describe('canonical order', () => {
  // Dissemination controls have no single canonical order. The governing
  // vocabulary changes with the Marking Kind.
  it('orders a pure-CUI Marking alphabetically, not in classic IC order', () => {
    expect(DISSEM_ORDER_CUI.slice(0, 4)).toEqual(['AC', 'AWP', 'DISPLAYONLY', 'DL_ONLY'])
  })

  it('orders a classic IC Marking by the register, not alphabetically', () => {
    expect(DISSEM_ORDER_IC.slice(0, 4)).toEqual(['RS', 'FOUO', 'OC', 'OC-USGOV'])
  })

  it('disagrees between kinds on DL_ONLY versus NF', () => {
    const cui = DISSEM_ORDER_CUI
    expect(cui.indexOf('DL_ONLY')).toBeLessThan(cui.indexOf('NF'))

    const commingled = DISSEM_ORDER_COMMINGLED
    expect(commingled.indexOf('NF')).toBeLessThan(commingled.indexOf('DL_ONLY'))
  })

  it('only ever orders tokens that exist in the master vocabulary', () => {
    const known = new Set<string>(DISSEM_CONTROL_TOKENS)
    for (const order of [DISSEM_ORDER_IC, DISSEM_ORDER_CUI, DISSEM_ORDER_COMMINGLED]) {
      expect(order.filter((t) => !known.has(t))).toEqual([])
    }
  })

  it('never lists a token twice within one order', () => {
    for (const order of [DISSEM_ORDER_IC, DISSEM_ORDER_CUI, DISSEM_ORDER_COMMINGLED]) {
      expect(new Set(order).size).toBe(order.length)
    }
  })
})

describe('literal tokens', () => {
  // A guard against regression. The CVE JSON writes a regular-expression term
  // the same way as a literal, so generating from the JSON alone put
  // `NATO:[a-zA-Z\-_]{1,256}` into the token unions as if it were a marking. The
  // XSD decides which is which. See
  // docs/adr/0003-vocabularies-are-generated-and-committed.md.
  const REGEX_METACHARACTERS = /[[\]{}()*+?\\^$|]/u

  const vocabularies = {
    DISSEM_CONTROL_TOKENS,
    SCI_CONTROL_TOKENS,
    NON_US_CONTROL_TOKENS,
    OWNER_PRODUCER_TOKENS,
    REL_TO_ENTITY_TOKENS,
    TETRAGRAPH_TOKENS,
  }

  for (const [name, tokens] of Object.entries(vocabularies)) {
    it(`${name} contains no regular expressions`, () => {
      expect(tokens.filter((t) => REGEX_METACHARACTERS.test(t))).toEqual([])
    })
  }

  it('holds pattern terms separately from the literal union', () => {
    expect(OWNER_PRODUCER_PATTERNS).toEqual(['NATO:[a-zA-Z\\-_]{1,256}'])
    expect(OWNER_PRODUCER_TOKENS).not.toContain('NATO:[a-zA-Z\\-_]{1,256}')
    // The bare organisation is a literal; only the sub-organisation is a pattern.
    expect(OWNER_PRODUCER_TOKENS).toContain('NATO')
  })
})

describe('banner spelling', () => {
  it('maps the abbreviated controls', () => {
    expect(BANNER_SPELLING['NF']).toBe('NOFORN')
    expect(BANNER_SPELLING['OC']).toBe('ORCON')
    expect(BANNER_SPELLING['RS']).toBe('RSEN')
    expect(BANNER_SPELLING['U']).toBe('UNCLASSIFIED')
  })

  // A token absent from the table renders unchanged. FOUO is the unexpected
  // case: the banner is `UNCLASSIFIED//CUI//LEI//FOUO`, not
  // `FOR OFFICIAL USE ONLY`. CVE descriptions are never used for rendering.
  it('omits tokens that render verbatim', () => {
    expect(BANNER_SPELLING['FOUO']).toBeUndefined()
    expect(BANNER_SPELLING['FISA']).toBeUndefined()
    expect(BANNER_SPELLING['DL_ONLY']).toBeUndefined()
    expect(BANNER_SPELLING['SI']).toBeUndefined()
  })
})

describe('deprecation', () => {
  it('records deprecated entities with their dates', () => {
    expect(ISMCAT_DEPRECATED['AOSC']).toBe('2005-12-12')
    expect(Object.keys(ISMCAT_DEPRECATED)).toHaveLength(18)
  })

  it('keeps deprecated terms in the vocabulary so historical markings parse', () => {
    expect(TETRAGRAPH_TOKENS).toContain('AOSC')
  })
})

const includes = (xs: readonly string[], t: string): boolean => xs.includes(t)

describe('ISMCAT composition', () => {
  // The four ISMCAT attributes are the same two lists in different
  // combinations. Codegen checks each composition against its CVE and stops on a
  // mismatch. These tests assert the shape that results.
  it('separates country trigraphs from coalition tetragraphs', () => {
    expect(TRIGRAPH_TOKENS).toHaveLength(280)
    expect(TETRAGRAPH_TOKENS).toHaveLength(61)
    // Disjoint, and together with FGI they account for every entity.
    const overlap = TRIGRAPH_TOKENS.filter((t) =>
      (TETRAGRAPH_TOKENS as readonly string[]).includes(t),
    )
    expect(overlap).toEqual([])
    expect(Object.keys(ISMCAT_DESCRIPTIONS)).toHaveLength(280 + 61 + 1)
  })

  it('names the USA first in a releasability list, not alphabetically', () => {
    expect(REL_TO_ENTITY_TOKENS[0]).toBe('USA')
    expect(TRIGRAPH_TOKENS[0]).toBe('ABW')
  })

  it('admits AX1 only where the register does', () => {
    expect(includes(FGI_OPEN_ENTITY_TOKENS, 'AX1')).toBe(true)
    expect(includes(OWNER_PRODUCER_TOKENS, 'AX1')).toBe(false)
    expect(includes(REL_TO_ENTITY_TOKENS, 'AX1')).toBe(false)
    expect(includes(FGI_PROTECTED_ENTITY_TOKENS, 'AX1')).toBe(false)
  })

  it('carries the FGI marker only where a concealed source is permitted', () => {
    expect(includes(OWNER_PRODUCER_TOKENS, 'FGI')).toBe(true)
    expect(includes(FGI_PROTECTED_ENTITY_TOKENS, 'FGI')).toBe(true)
    expect(includes(REL_TO_ENTITY_TOKENS, 'FGI')).toBe(false)
    expect(includes(FGI_OPEN_ENTITY_TOKENS, 'FGI')).toBe(false)
  })

  it('ends every vocabulary with the same tetragraph run', () => {
    for (const tokens of [
      OWNER_PRODUCER_TOKENS,
      REL_TO_ENTITY_TOKENS,
      FGI_OPEN_ENTITY_TOKENS,
      FGI_PROTECTED_ENTITY_TOKENS,
    ]) {
      expect(tokens.slice(-TETRAGRAPH_TOKENS.length)).toEqual([...TETRAGRAPH_TOKENS])
    }
  })
})

describe('CUI designations', () => {
  // CUI Basic and CUI Specified are two designations over one registry, not two
  // registries. 27 categories carry both, with the same description.
  it('covers the registry with the two designations, and nothing else', () => {
    const registry = new Set([...CUI_BASIC_TOKENS, ...CUI_SPECIFIED_TOKENS])
    expect(registry.size).toBe(123)
    expect(CUI_BASIC_TOKENS).toHaveLength(93)
    expect(CUI_SPECIFIED_TOKENS).toHaveLength(57)
  })

  it('has categories carrying both designations', () => {
    const specified = new Set<string>(CUI_SPECIFIED_TOKENS)
    const both = CUI_BASIC_TOKENS.filter((t) => specified.has(t))
    expect(both).toHaveLength(27)
  })

  it('describes every category in both token lists', () => {
    for (const t of [...CUI_BASIC_TOKENS, ...CUI_SPECIFIED_TOKENS]) {
      expect(CUI_DESCRIPTIONS[t]).toBeTypeOf('string')
    }
  })
})
