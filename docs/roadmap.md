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
sub-organisations in `releasableTo`, which the library already supports. It requires:

- `CVEnumISMHighWaterNATO` (`NATO-U` through `NATO-TS`) as another classification
  vocabulary;
- a representation of NATO ownership that does not weaken US and foreign ownership
  types;
- classification-segment parsing and rendering selected by the ownership regime.

### Additional Marking-level validation rules

`validate` implements 109 of ODNI's 535 rules: 100 unique IDs represented by generated
inventories and 9 exhaustive written checkers. The remaining rules are not one uniform
backlog. Most require document context, and 398 have bespoke XPath rather than a reusable
abstract pattern.

Add a remaining rule to `Marking` validation only when all of its inputs are
string-expressible. Rules requiring document structure or authority-block attributes
belong with the wider resource model below.

## Capabilities requiring a wider resource model

These cannot be added by widening `Marking`. [ADR 0001](./adr/0001-marking-is-the-string-expressible-projection.md)
defines `Marking` as the string-expressible projection of the ISM attribute set.

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

### Rollup

Rollup derives a document's overall Marking from the Markings of its constituent parts.
It operates on a tree, deliberately loses information in some cases, and therefore needs
a document model rather than a wider single `Marking`.

The reference implementation lives under `references/ISM-Rollup-.../XSL`. Whether the
future document model remains in `@ismjs/core` or earns a separate package should be
decided from the resulting public interface, not in advance.

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
