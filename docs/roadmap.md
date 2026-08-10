# Roadmap

This document records likely directions, not release commitments. The shipped API and
current limits are described in the [README](../README.md); architectural boundaries are
described in [ARCHITECTURE.md](../ARCHITECTURE.md).

The vendored ODNI corpus contains 189 rendering vectors. The current v1 target passes 139. The other 50 are retained with explicit reasons: 30 require Special Access Program
support and 20 require NATO ownership.

## Deferred codec capabilities

These additions still operate on marking strings and fit the purpose of `@ismjs/core`.
Their order here is not an implementation priority.

### Special Access Programs (SAP/SAR)

Thirty official vectors are deferred. Support requires:

- the `SAPRenderingRuleSet` switch, which selects a rendering style;
- SAP/SAR vocabulary and segment parsing/rendering;
- `SAR-MULTIPLE PROGRAMS`, where three or more identifiers collapse into one rendered
  value.

That collapse is lossy and would add a sixth documented round-trip loss. The existing
Compartment machinery should remain reusable, but the new segment still needs its own
grammar and authority-backed tests.

### NATO ownership

Twenty official vectors are deferred. NATO ownership is distinct from NATO
Special Words in entity lists, which the library already recognizes. It requires:

- a precise ownership/classification union that adds NATO RESTRICTED without weakening
  US and foreign ownership branches;
- authority-derived NATO Special Word spelling and Portion Mark abbreviations;
- classification-segment parsing and rendering selected by ownership; and
- explicit failures where rendered syntax cannot distinguish a NATO Special Word from
  multiple Owner-Producers, or cannot preserve an unabbreviated Special Word.

### Additional Marking-level validation rules

`validate` implements 109 of ODNI's 535 rules: 100 unique IDs represented by generated
inventories and 9 exhaustive written checkers. The remaining rules are not one uniform
backlog. Most require document context, and 398 have bespoke XPath rather than a reusable
abstract pattern.

Add a remaining rule to `Marking` validation only when all of its inputs are
string-expressible. Rules requiring document structure or authority-block attributes
belong with the wider resource model below.

## Planned Rollup package

### Classification High-Water and Marking Rollup

`@ismjs/rollup` will derive one overall Marking from an explicit set of canonical
contributing Markings. It also exposes Classification High-Water independently for
builder workflows. This flat kernel does not require a Resource tree; it is a separate
package because Rollup is lossy, many-to-one derivation rather than a strict codec
operation.

The first target profile is USA-owned output. It covers the authority-backed field
matrix, including CUI union, and fails explicitly for unresolved `displayOnlyTo`, second
Banner Line, and `HVCO` channel semantics. NATO-owned and arbitrary foreign output
profiles remain later work. Implementation follows the NATO and SAP core model changes
but does not by itself establish 1.0.0 readiness.

The complete contract, authority hierarchy, diagnostics, evidence plan, and phased
implementation order are in the [Rollup capability design](./rollup.md). The package
boundary and separation from Resource Rollup are recorded in
[ADR 0008](./adr/0008-marking-rollup-is-a-separate-package-and-resource-rollup-remains-separate.md).

## Capabilities requiring a wider resource model

These cannot be added by widening `Marking`. [ADR 0001](./adr/0001-marking-is-the-string-expressible-projection.md)
defines `Marking` as the string-expressible projection of the ISM attribute set.

### NATO high-water metadata

`highWaterNATO` records the highest NATO classification represented among relevant
portions so resource rollup and entity access controls can evaluate NATO content. It is
not the primary classification of a NATO-Owned Marking; the authority rules prohibit it
when the sole Owner-Producer is `NATO`.

The schema annotation says the attribute is rendered in Banner Lines and Portion Marks,
but the supplied banner and portion rendering XSLT does not consume it directly. A future
resource model should resolve that discrepancy against additional authority evidence
before exposing a public NATO High-Water Value or claiming rendering behavior.

### Classification Authority and Control/Decontrol Blocks

Attributes such as `classifiedBy`, `derivedFrom`, `declassDate`,
`classificationReason`, and `cuiControlledBy` appear in the ISM attribute set but in no
Banner Line or Portion Mark. Sixty-nine of the 189 official vectors carry at least one
such attribute.

Supporting them requires a resource-level type that contains a `Marking`; they should
not become optional fields on `Marking` itself.

### XML reading and writing

The current package is a string codec. Reading `ism:*` attributes from XML and writing
them back depends on the resource-level model above. XML transport should remain outside
the parse/format grammar even if it ultimately ships from the same package.

### Resource Rollup

Resource Rollup discovers contributing parts in a document tree and derives both the
overall Marking and document-only metadata. It requires a Resource model for exclusion,
ownership, declassification, Notices, Need-To-Know, and related context, then delegates
the explicit contributor batch to the Marking Rollup kernel.

Resource design remains a separate planning topic. It should not be inferred from the
reference XML transform while implementing `@ismjs/rollup`.

## Outside the marking codec

### Notices and Need-To-Know

Notices and Need-To-Know are separate XML subsystems rather than marking-string
segments. They are outside the scope of the codec. They should be considered only as
independent capabilities if the project expands beyond marking strings.

## Possible product packages

These names and boundaries are exploratory, not committed:

| Candidate                            | Possible responsibility                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `@ismjs/headless` or `@ismjs/editor` | Framework-independent marking-construction state, validation feedback, keyboard behavior, and accessibility semantics |
| `@ismjs/react`                       | React bindings over the framework-independent state model                                                             |
| `@ismjs/ui`                          | Opinionated reference components and styling                                                                          |

The framework-independent boundary should be designed before either framework binding or
reference UI. Choose `headless` only if it owns interaction behavior beyond construction;
otherwise `editor` is the more precise name.

## Not planned without evidence

Bitset storage for Markings remains an available internal optimization, but current
profiling does not justify it. It should be reconsidered only if validation or Rollup
demonstrates a measurable set-algebra bottleneck; it is not a roadmap item on its own.
