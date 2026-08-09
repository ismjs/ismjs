import { describe, expect, it } from 'vitest'
import { RenderMode, format } from '../src/format.ts'

/**
 * Worked examples from marking policy, not from ODNI's suites.
 *
 * Every other rendering test here is checked against a vector ODNI generated
 * from the stylesheets this library reimplements. Agreement with those vectors
 * shows only that the reimplementation is faithful. These examples come from a
 * different authority, which had no part in the stylesheets, so they can
 * disagree. That is what makes them useful.
 *
 * Source: "Controlled Unclassified Information Markings", OUSD(I&S) DDI(CL&S),
 * December 2024, cleared for open publication as DOPSR 25-P-0275.
 * See `references/Cleared-CUI-Training-Aid-Markings-2024.pdf`.
 */
describe('published policy examples', () => {
  /**
   * Page 6: "USA is always listed first followed by trigraphs in alphabetical
   * order, then tetragraphs in alphabetical order", with the worked example
   * `REL TO USA, EST, ISR, FVEY, NATO`.
   *
   * The input is deliberately scrambled: this pins Canonical Order for
   * `releasableTo` against a stated rule, not against the CVE the order was
   * generated from.
   */
  it('orders a releasability list as the CUI marking guidance states', () => {
    const banner = format(
      {
        classification: 'U',
        ownerProducer: ['USA'],
        disseminationControls: ['REL'],
        releasableTo: ['NATO', 'ISR', 'FVEY', 'USA', 'EST'],
      },
      RenderMode.Banner,
    )

    expect(banner).toBe('UNCLASSIFIED//REL TO USA, EST, ISR, FVEY, NATO')
  })

  /**
   * Page 3: "Do not add 'UNCLASSIFIED' before 'CUI.'"
   *
   * This is the rule `leadsWithCui` implements, stated by a source that is not
   * the stylesheet. A pure CUI Marking leads with `CUI` outright; the
   * classification segment is not merely omitted from the front, it is absent.
   *
   * `BUDG` is the category the guidance uses in its own examples. ISM registers
   * it as CUI Specified rather than CUI Basic, so it renders with the `SP-`
   * prefix — which is why the assertion is on the head of the string.
   */
  it('never prefixes a pure CUI banner with UNCLASSIFIED', () => {
    const banner = format(
      { classification: 'U', ownerProducer: ['USA'], cuiSpecified: ['BUDG'] },
      RenderMode.Banner,
    )

    expect(banner.startsWith('CUI')).toBe(true)
  })
})
