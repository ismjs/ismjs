/**
 * Display labels for every vocabulary, published as `@ismjs/core/descriptions`.
 *
 * Separate from the codec, because nothing in the codec reads them. They are
 * about 63 kB of text that a parser and a formatter never touch, and the
 * single-file bundle cannot tree-shake. A consumer that shows markings asks for
 * them. A consumer that only reads and writes strings never pays for them.
 *
 * The same codegen generates them from the same CVEs, and each table is checked
 * against its token union at compile time, so a label cannot drift from the
 * vocabulary it describes.
 *
 * Know these two facts before you show a label to a user:
 *
 * - **CUI descriptions are sentences, not labels.** 121 of 123 are longer than
 *   60 characters, and the median is 209. Each one starts with a short name and
 *   then explains the category, so a chip wants the first sentence and a tooltip
 *   wants the rest.
 * - **Some descriptions repeat the token.** 8 of 20 SCI controls describe
 *   themselves: the description of `BUR` is `BUR`. Show the token instead of
 *   `BUR — BUR`.
 */
export {
  ANY_CLASSIFICATION_DESCRIPTIONS,
  ATOMIC_ENERGY_MARKING_DESCRIPTIONS,
  DISSEM_CONTROL_DESCRIPTIONS,
  NON_IC_MARKING_DESCRIPTIONS,
  NON_US_CONTROL_DESCRIPTIONS,
  SCI_CONTROL_DESCRIPTIONS,
  US_CLASSIFICATION_DESCRIPTIONS,
  CUI_DESCRIPTIONS,
  ISMCAT_DESCRIPTIONS,
  SECOND_BANNER_LINE_DESCRIPTIONS,
  TETRAGRAPH_DESCRIPTIONS,
  TRIGRAPH_DESCRIPTIONS,
} from './generated/descriptions.ts'
