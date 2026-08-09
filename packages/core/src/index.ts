/**
 * A codec for Information Security Markings.
 *
 *   parse          a marking string      ->  a Marking, or why it is not one
 *   format         fields or a Marking   ->  a Banner Line or a Portion Mark
 *   validate       a string or fields    ->  the issues, if the rules refuse it
 *   createMarking  fields                ->  a Marking, in Canonical Order
 *
 * `format`, `validate` and `createMarking` all take plain fields, so
 * `createMarking` is needed only when you want the canonical object itself.
 *
 * `validate` also takes a string, and the other two do not. The result is the
 * reason: `validate` returns a list of problems, so "the library cannot read
 * this string" is one more problem in that list. The others return a value, and
 * a bad string has no place to go in a value. Use `parse` first.
 */

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export { type ParseOptions, parse } from './parse.ts'
export { RenderMode, format } from './format.ts'
export { type ValidateOptions, validate } from './validate.ts'
export { createMarking } from './normalize.ts'

// ---------------------------------------------------------------------------
// What they return
// ---------------------------------------------------------------------------

export { type Issue, type ParseResult, IssueCode, Severity } from './issue.ts'

// ---------------------------------------------------------------------------
// The Marking, and the types of everything in it
// ---------------------------------------------------------------------------

export {
  type FgiOpenExpression,
  type FgiProtectedExpression,
  type Marking,
  type MarkingInput,
  type NatoSubOrganisation,
  type NonIcExpression,
  type RelToExpression,
  type RenderableDissemControl,
  type SciExpression,
  MarkingKind,
  markingKind,
} from './marking.ts'

/**
 * The generated vocabularies, as types. A UI building a picker needs to name
 * what goes in it; these cost nothing at runtime.
 */
export type {
  AtomicEnergyMarking,
  DissemControl,
  NonUsControl,
  SciControl,
  SecondBannerLine,
  UsClassification,
} from './generated/vocab.ts'
export type { CuiBasic, CuiCategory, CuiSpecified } from './generated/cui.ts'
export type {
  FgiOpenEntity,
  FgiProtectedEntity,
  OwnerProducer,
  RelToEntity,
  Tetragraph,
  Trigraph,
} from './generated/ismcat.ts'

/**
 * Canonical Order, as a phantom brand minted at the normalization boundary.
 * Public callers obtain one through `createMarking` or a successful `parse`;
 * everything downstream may rely on it. See
 * docs/adr/0002-canonical-order-via-branded-arrays.md.
 */
export type { Canonical, CanonicalNonEmpty, NonEmpty } from './canonical.ts'

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** Vocabulary values this library names, so a caller need not write literals. */
export * as tokens from './tokens.ts'

/** Coalition membership: what a tetragraph such as `FVEY` stands for. */
export { combineEntities, decomposes, expandEntities, membersOf } from './entities.ts'

/** Restricting a deployment to the markings it may issue. Not a security control. */
export { type Profile, type ProfileField, type Restriction, profileFor } from './profile.ts'

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/** The ODNI specification edition this library encodes, read from the packages. */
export { SPEC_VERSION } from './generated/spec-version.ts'

/** This library's own version, so a vendored single-file copy can name itself. */
export { VERSION } from './version.ts'
