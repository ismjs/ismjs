/**
 * A Marking as read off the string. The shape is right, but every value is still
 * text. Nothing has been checked against a vocabulary yet, so the fields are
 * `string` and not the token types. To write a raw string into a typed field
 * would need an assertion, and that assertion would not be true.
 *
 * `parse` checks a completed draft against the vocabularies. That check earns the
 * one conversion into a `MarkingInput`.
 */
export type Draft = {
  classification?: string
  ownerProducer?: readonly string[]
  joint?: boolean
  SCIcontrols?: readonly string[]
  atomicEnergyMarkings?: readonly string[]
  disseminationControls?: readonly string[]
  releasableTo?: readonly string[]
  displayOnlyTo?: readonly string[]
  FGIsourceOpen?: readonly string[]
  FGIsourceProtected?: readonly string[]
  nonICmarkings?: readonly string[]
  nonUSControls?: readonly string[]
  cuiBasic?: readonly string[]
  cuiSpecified?: readonly string[]
  secondBannerLine?: readonly string[]
  handleViaChannels?: string
}
