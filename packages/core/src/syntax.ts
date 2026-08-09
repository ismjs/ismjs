/**
 * The punctuation and fixed wording of a marking string.
 *
 * Nothing here is a controlled vocabulary value. Those are in `tokens.ts`, where
 * they can be checked against the generated CVEs. These are the literals the
 * specification writes around them.
 */

// ---------------------------------------------------------------------------
// Delimiters
// ---------------------------------------------------------------------------

/** Separates one segment of a marking from the next: `TS//SI//NF`. */
export const SEGMENT = '//'

/** Separates entries within a segment: `NF/DSEN`. */
export const ITEM = '/'

/** Separates entities in a releasability list: `USA, GBR`. */
export const LIST = ', '

/** Separates a control from its Compartment: `SI-G`. */
export const COMPARTMENT = '-'

/** Separates a Compartment from its subcompartment: `SI-G ABCD`. */
export const SUBCOMPARTMENT = ' '

/** Separates owner-producers from one another, and from a classification. */
export const WORD = ' '

/** Introduces a second Banner Line. */
export const SECOND_LINE = '|'

/** A Portion Mark is parenthesised, and carries a trailing space. */
export const PORTION_OPEN = '('
export const PORTION_CLOSE = ') '

// ---------------------------------------------------------------------------
// Fixed wording
// ---------------------------------------------------------------------------

/** Precedes the owner-producers of a jointly owned Marking. */
export const JOINT = 'JOINT'

/** Marks Controlled Unclassified Information, leading or following the classification. */
export const CUI = 'CUI'

/** Distinguishes a CUI Specified category from a Basic one: `SP-AIV`. */
export const CUI_SPECIFIED_PREFIX = 'SP-'

/** Alternative Compensatory Control Measures share one qualifier, on the first entry. */
export const ACCM_PREFIX = 'ACCM-'

/** Non-US controls are registered qualified but render bare: `NATO-ATOMAL` -> `ATOMAL`. */
export const NON_US_QUALIFIER = 'NATO-'

export const REL_TO = 'REL TO '
export const EYES_ONLY = ' EYES ONLY'
export const DISPLAY_ONLY = 'DISPLAY ONLY '

/** `HVCO`'s description leaves a gap for the channels `handleViaChannels` names. */
export const HANDLE_VIA = 'HANDLE VIA '

// ---------------------------------------------------------------------------
// Spellings BannerMapping.xml omits
// ---------------------------------------------------------------------------

/**
 * The reference stylesheets add these inline instead of putting them in
 * `BannerMapping.xml`, so this file must carry them too.
 */
export const BANNER_ORCON_USGOV = 'ORCON-USGOV'
export const BANNER_SIGMA = 'SIGMA'

/** Atomic energy markings whose Banner Line spelling differs from their token. */
export const BANNER_ATOMIC_ENERGY: Readonly<Record<string, string>> = {
  DCNI: 'DOD UCNI',
  UCNI: 'DOE UCNI',
}
