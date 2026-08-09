# Canonical field order is enforced by branded arrays

A Marking's multi-valued fields have exactly one stored order, fixed by the controlled
vocabulary governing its Marking Kind — and the governing vocabulary differs by kind,
so `DL_ONLY NF` is correct for a pure-CUI Marking while `NF/DSEN` is correct for a
classic one. We represent these fields as `readonly` arrays carrying a type brand that
only `createMarking()` can mint, so nothing downstream has to re-check their Canonical
Order.

Canonical Order governs the value stored in a Marking. Presentation Order governs where
those values appear in a Banner Line or Portion Mark. They are normally the same, but
marking syntax may require a lossless rearrangement at render time. ACCM entries are the
case in this release: their field remains in vocabulary order, while the renderer places
them directly after `DS`, matching `ism-func:sortNonIC`.

A Presentation Order transformation operates on an already-canonical field, does not
mutate or re-mint it, and may not add, remove, or duplicate tokens. The parser uses the
same transformation when checking the order supplied by a string. The round-trip law
therefore remains object identity rather than weakening to set equality.

## Considered Options

`Set` was rejected: it is insertion-ordered rather than canonically ordered, and does
not survive `JSON.stringify` or structural comparison. Plain arrays with a defensive
normalizing sort inside `format()` were rejected because they would admit arbitrary
field order and weaken the round-trip law to set equality. A Presentation Order view is
different: its input is already branded, its output is not a Marking, and its token
membership is unchanged. Bitsets were rejected as premature — they remain available as
an internal representation behind the brand if profiling ever justifies it.

## The brand is an internal guarantee, not a hoop for callers

Originally `format()` took a `Marking`, so a caller holding plain fields had to mint one
first. That made the brand a precondition on the public surface, and put a function named
for an internal transformation between a consumer and the two things they came for.

`format()` and `validate()` now take plain fields and canonicalise on the way in. The
guarantee is unchanged — everything below the entry point still receives a `Marking`, and
`Marking` is assignable to the input type, so passing one costs nothing. What changed is
who pays for it: the library, not the caller. `createMarking()` remains for when the
canonical object itself is wanted.

## Consequences

`createMarking()` is the single place that deduplicates and establishes Canonical Order.
It does **not** displace tokens: what looked like Supersession — `SI` beside `SI-G`, `OC`
beside `OC-USGOV` — is Consumption, a rendering step, and both tokens stay in the
Marking. That correction was made twice; see CONTEXT.md.

A renderer may establish Presentation Order, but only as a documented, lossless view.
Presentation Order is not normalization and is not Consumption: the former rearranges
tokens, while the latter decides which canonical facts are visibly represented. Any
Presentation Order exception must be shared with strict parsing so rendered output is
accepted without weakening checks on caller-supplied order.

Note that ODNI does not actually validate ordering — the `ValuesOrderedAccordingToCve`
Schematron pattern is included but never instantiated by any of the 535 rules, and the
reference XSL simply sorts silently. Treating non-canonical order as an error is our
decision, so those issues carry a `code` but never a `ruleId`.
