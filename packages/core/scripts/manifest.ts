/**
 * Which controlled vocabularies are generated, and under what names.
 *
 * Edit this file when the v1 scope grows. To add SAP, add `CVEnumISMSAR` here.
 * To add NATO ownership, add the NATO vocabularies. See docs/roadmap.md for what
 * is absent on purpose.
 */

export type CveGroup = 'ISM' | 'ISMCAT'

/**
 * CVEs that intentionally have no generated XSD to arbitrate pattern terms.
 *
 * Absence must be declared here. An undeclared missing XSD is an authority-data
 * failure, never evidence that every JSON term is literal.
 */
export const CVES_WITHOUT_XSD: ReadonlySet<`${CveGroup}/${string}`> = new Set()

export type VocabularySpec = {
  /** The exported union type name. */
  readonly type: string
  /** Prefix for the exported constants: `${const}_TOKENS`, `_DESCRIPTIONS`, … */
  readonly const: string
  readonly group: CveGroup
  readonly cve: string
}

/**
 * Each entry becomes a union type, an ordered token list, a description record
 * and a deprecation record. A vocabulary that admits regular expressions also
 * gets a pattern list.
 *
 * `SAR`, `Notice`, `25X` and the NTK vocabularies are absent on purpose.
 */
export const VOCABULARIES: readonly VocabularySpec[] = [
  {
    type: 'UsClassification',
    const: 'US_CLASSIFICATION',
    group: 'ISM',
    cve: 'CVEnumISMClassificationUS',
  },
  {
    type: 'AnyClassification',
    const: 'ANY_CLASSIFICATION',
    group: 'ISM',
    cve: 'CVEnumISMClassificationAll',
  },
  { type: 'SciControl', const: 'SCI_CONTROL', group: 'ISM', cve: 'CVEnumISMSCIControls' },
  {
    type: 'AtomicEnergyMarking',
    const: 'ATOMIC_ENERGY_MARKING',
    group: 'ISM',
    cve: 'CVEnumISMAtomicEnergyMarkings',
  },
  { type: 'DissemControl', const: 'DISSEM_CONTROL', group: 'ISM', cve: 'CVEnumISMDissem' },
  { type: 'NonIcMarking', const: 'NON_IC_MARKING', group: 'ISM', cve: 'CVEnumISMNonIC' },
  { type: 'NonUsControl', const: 'NON_US_CONTROL', group: 'ISM', cve: 'CVEnumISMNonUSControls' },
  {
    type: 'SecondBannerLine',
    const: 'SECOND_BANNER_LINE',
    group: 'ISM',
    cve: 'CVEnumISMSecondBannerLine',
  },
]

/**
 * The ISMCAT vocabularies are handled on their own. All four are the same two
 * lists in different combinations: GENC country trigraphs and IC coalition
 * tetragraphs. To emit each one in full repeats about 340 country names four
 * times, and hides the rules below inside those lists.
 *
 * Each vocabulary is `lead`, then the trigraphs in alphabetical order without
 * `excludeTrigraphs` and without anything already in `lead`, then the
 * tetragraphs. Codegen checks that each composition reproduces its CVE exactly
 * and stops if it does not. A future DES release cannot make this wrong quietly.
 */
export type IsmcatVocabularySpec = {
  readonly type: string
  readonly const: string
  readonly cve: string
  /** Tokens placed ahead of the alphabetical trigraph run. */
  readonly lead: readonly string[]
  readonly excludeTrigraphs: readonly string[]
  readonly note: string
}

export const ISMCAT_TETRAGRAPH_CVE = 'CVEnumISMCATTetragraph'

export const ISMCAT_VOCABULARIES: readonly IsmcatVocabularySpec[] = [
  {
    type: 'OwnerProducer',
    const: 'OWNER_PRODUCER',
    cve: 'CVEnumISMCATOwnerProducer',
    lead: ['FGI'],
    excludeTrigraphs: ['AX1'],
    note: 'FGI, then GENC trigraphs except AX1, then coalition tetragraphs',
  },
  {
    // USA leads instead of sorting alphabetically. A releasability list always
    // names the USA first: `REL TO USA, CAN, GBR`.
    //
    // The DoD CUI marking guidance states this, and it had no part in the CVE
    // this order is generated from: "USA is always listed first followed by
    // trigraphs in alphabetical order, then tetragraphs in alphabetical order",
    // with the example `REL TO USA, EST, ISR, FVEY, NATO`. Pinned in
    // test/policy-examples.spec.ts.
    type: 'RelToEntity',
    const: 'REL_TO_ENTITY',
    cve: 'CVEnumISMCATRelTo',
    lead: ['USA'],
    excludeTrigraphs: ['AX1'],
    note: 'USA first, then the remaining GENC trigraphs except AX1, then tetragraphs',
  },
  {
    type: 'FgiOpenEntity',
    const: 'FGI_OPEN_ENTITY',
    cve: 'CVEnumISMCATFGIOpen',
    lead: [],
    excludeTrigraphs: ['USA'],
    note: 'GENC trigraphs except USA — AX1 is permitted here — then tetragraphs',
  },
  {
    type: 'FgiProtectedEntity',
    const: 'FGI_PROTECTED_ENTITY',
    cve: 'CVEnumISMCATFGIProtected',
    lead: ['FGI'],
    excludeTrigraphs: ['USA', 'AX1'],
    note: 'FGI, then GENC trigraphs except USA and AX1, then tetragraphs',
  },
]

export type OrderSpec = {
  readonly const: string
  readonly cve: string
  readonly note: string
}

/**
 * Dissemination controls have no single canonical order. The governing
 * vocabulary changes with the Marking Kind. A pure CUI Marking puts `DL_ONLY`
 * before `NF`. A classic IC Marking puts `NF` before `DSEN`.
 */
export const ORDERS: readonly OrderSpec[] = [
  { const: 'DISSEM_ORDER_IC', cve: 'CVEnumISMDissemIcrm', note: 'classic IC Markings' },
  {
    // Checked against the Limited Dissemination Controls in the ISOO CUI
    // Registry. The 10 LDCs it lists are this vocabulary without
    // EXEMPT_FROM_ICD501_DISCOVERY, which is an IC construct rather than an LDC
    // and is already outside `RenderableDissemControl` because no string
    // renders it.
    //
    // The registry gives no order for multiple LDCs. The sequence here is the
    // CVE's alone.
    const: 'DISSEM_ORDER_CUI',
    cve: 'CVEnumISMDissemCui',
    note: 'pure CUI Markings',
  },
  {
    const: 'DISSEM_ORDER_COMMINGLED',
    cve: 'CVEnumISMDissemCommingled',
    // FOUO is absent from this register by policy, not by omission. DoDM
    // 5200.01-V2, Encl 4 §10.b.(3) keeps FOUO out of the overall classification
    // banner, because the classification already protects the information.
    note: 'Commingled Markings — FOUO excluded, see DoDM 5200.01-V2 Encl 4 §10.b.(3)',
  },
]

/**
 * CUI Basic and CUI Specified are two designations over one registry of
 * categories, not two vocabularies. 27 categories carry both. They share one
 * description table. See scripts/cui.ts.
 */
export const CUI_VOCABULARIES = [
  {
    type: 'CuiBasic',
    const: 'CUI_BASIC',
    cve: 'CVEnumISMCUIBasic',
    note: 'categories handled under the CUI Basic designation',
  },
  {
    type: 'CuiSpecified',
    const: 'CUI_SPECIFIED',
    cve: 'CVEnumISMCUISpecified',
    note: 'categories whose authority prescribes specific handling',
  },
] as const satisfies readonly { type: string; const: string; cve: string; note: string }[]
