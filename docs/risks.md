# Known risks and evidence gaps

This document records places where the library's output can be correct for its chosen
authority and still surprise a consumer, or where the available evidence cannot settle
the behavior completely. These are boundaries to understand, not a list of untriaged
bugs.

| Area                                          | Consumer effect                                                  | Current guard                                          |
| --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| ISM.XML and DoD CUI differ                    | A valid ISM.XML Banner Line may be unsuitable for a DoD document | Warning in the README and policy-example tests         |
| Some foreign-owned CUI is lossy               | Ownership can disappear from rendered output                     | Explicit round-trip loss tests                         |
| `compliesWith` is absent                      | Marking Kind and USGov rule applicability must be inferred       | Corpus agreement and documented assumptions            |
| Official vectors test rendering               | A rendered vector may still violate a rule                       | Separate validation suites and 111 clean Portion Marks |
| SCI compartments lack a public register       | Membership checks accept registered stems with free compartments | Official vectors and stem-focused tests                |
| Most registers contain no retirement examples | Some deprecation paths are wired but unexercised by current data | Generated metadata and drift tests                     |
| Rule-to-field mapping is structural           | A future Schematron shape could be assigned to the wrong field   | Generated inventories and count assertions             |
| Second Banner Lines are sparsely represented  | Edge cases have less independent evidence                        | Focused tests and dependent-value checks               |

## ISM.XML and DoD CUI guidance produce different Banner Lines

**Effect.** This library follows ODNI ISM.XML. It renders a pure CUI marking such as
`CUI//SP-BUDG` and can place a `CUI` segment inside a classified Banner Line. DoD CUI
guidance instead uses a bare `CUI` Banner Line for an unclassified document and omits CUI
categories and controls from a classified Banner Line. It also spells `DL ONLY` and
`FED ONLY` where the vendored ISM.XML mapping renders `DL_ONLY` and `FED_ONLY`.

An application that copies `format` output directly onto a DoD document can therefore
produce a Banner Line that DoD guidance does not sanction, even though it matches the
authority this codec implements.

**Current guard.** The README names the boundary before installation. Official vectors
pin the ISM.XML forms, while `packages/core/test/policy-examples.spec.ts` independently
pins the two points where DoD guidance and ISM.XML agree. `validate` reports
ISM-ID-00486 when CUI and a non-IC marking are combined, but `format` remains total and
will still render the input.

**Revisit when.** A CUI Marking Handbook or DoDI 5200.48 revision defines a commingled
CUI Banner Line, or the project deliberately adds a separate DoD rendering policy.

## Foreign-owned CUI can render as pure CUI

**Effect.** A value shaped like
`{ classification: U, ownerProducer: [GBR], cuiBasic: […], FGIsourceOpen: [DEU] }`
renders as `CUI//…`, dropping the ownership segment. The reference implementation does
the same: FGI is not rendered on a non-US-controlled resource, and its leading-CUI test
then sees no rendered classic segment.

FGI and CUI are not generally incompatible. ODNI includes a Commingled Marking such as
`SECRET//SI//FGI GBR//CUI//…`. The loss arises only when foreign ownership, suppressed
FGI, and the pure-CUI leading rule interact.

**Current guard.** The combination is an explicit case in
`packages/core/test/lossy.ts`, and both round-trip suites assert the loss. `validate`
cannot reject it because the relevant ODNI rules discriminate on `compliesWith`, which
no marking string carries.

**Revisit when.** An authority supplies a field-based rule for this combination, or the
domain grows a resource-level value that can carry `compliesWith`.

## `compliesWith` is inferred rather than represented

**Effect.** `compliesWith` is part of the ISM attribute set but not expressible in a
Banner Line or Portion Mark, so it is intentionally absent from `Marking`. Three runtime
decisions consequently use observable fields as proxies:

- `markingKind` selects the Canonical Order vocabulary from classification and CUI
  fields;
- ISM-ID-00486 uses the presence of CUI categories instead of a USA-CUI declaration;
- harvested cross-field rules conditioned on `ISM_USGOV_RESOURCE` are treated as
  applicable to every Marking.

The last assumption can make `validate` stricter than the Schematron would be for a
resource governed by another authority. There is no string-expressible discriminator on
which to make a different decision.

**Current guard.** Derived Marking Kind agrees with `compliesWith` across all 139 active
official vectors. The assumptions are centralized in focused functions and covered by
rule and kind tests. This is evidence over the available corpus, not proof for every ISM
attribute set.

**Revisit when.** The library introduces the wider resource-level type anticipated by
[ADR 0001](./adr/0001-marking-is-the-string-expressible-projection.md), or receives a
string-expressible way to distinguish authority regimes.

## The official corpus proves rendering, not validity

**Effect.** The 189 ODNI XSpec vectors exercise rendering stylesheets. Minimal rendering
examples intentionally omit facts that validation rules require, and some all-types
examples combine mutually exclusive constructs. Passing every vector proves agreement
with rendering expectations; it does not prove that every source Marking is legal.

Applying `validate` to the 139 active vectors produces expected findings from 10 rule
IDs. Examples include Restricted Data without `NF`, `RD` beside `FRD`, and CUI beside a
non-IC marking. These are properties of the rendering corpus, not validator defects.

**Current guard.** `packages/core/test/validate-corpus.spec.ts` enumerates the exact
rule-to-vector findings so new violations cannot appear unnoticed. Separately,
`packages/core/test/fixtures/valid-portions.json` contains 111 independently sourced
Portion Marks that parse, re-render exactly, remain in Canonical Order, and produce no
validation issues.

**Revisit when.** ODNI publishes a corpus derived from Schematron validation cases. That
would provide stronger independent evidence for both accepted and rejected markings.

## SCI compartment membership is deliberately weaker than ISM-ID-00267

**Effect.** Read literally, ISM-ID-00267 checks every SCI value directly against
`CVEnumISMSCIControls`, which would reject compartments such as `SI-G-ABCD`. ODNI's own
active vectors contain `SI-G-ABCD`, `RSV-ABC`, and `RSV-DEF`, so `validate` checks the
registered Stem and permits a free Compartment suffix.

If a non-public compartment register exists, this is looser than the complete rule. If
SCI compartments are intentionally unenumerated, stem validation is the strongest
available check.

**Current guard.** Official examples and property tests cover compartment parsing,
rendering, and Stem selection.

**Revisit when.** A public SCI compartment authority becomes available.

## Deprecation evidence currently comes only from ISMCAT

**Effect.** Eighteen ISMCAT entities carry retirement dates. No other register in the
vendored release does, so only Marking fields backed by ISMCAT can currently produce a
deprecation finding. The generated paths for every other field are present but lack a
real retired token with which to exercise them.

**Current guard.** Deprecation metadata is generated rather than copied, and tests cover
warning/error behavior using the ISMCAT dates. Regeneration drift checks expose changes
when a future authority release adds retirement metadata elsewhere.

**Revisit when.** A DES update retires a dissemination, SCI, CUI, or other non-ISMCAT
token. The existing rules should begin firing without handwritten changes.

## The ISM-ID-to-field mapping is inferred from rule structure

**Effect.** The rule generator assigns an ODNI rule to a Marking field by reading
`@ism:<name>` from the Schematron rule's `context` or `attrValue` parameter. That mapping
is correct for the vendored release. A future rule whose context names a different
attribute from the one it constrains could be assigned incorrectly without a generator
error.

**Current guard.** Generated rule inventories, focused validation tests, and the asserted
count of 109 unique implemented ISM-IDs make broad drift visible. They do not prove the
meaning of an entirely new Schematron shape.

**Revisit when.** A specification update changes the harvested field counts or introduces
a rule shape not represented in the current inventories.

## Second Banner Lines have limited independent evidence

**Effect.** Only three official vectors exercise Second Banner Lines, all in Banner Line
mode. `handleViaChannels` interpolation into `HVCO` therefore has less independent
coverage than the main marking grammar. Portion Marks omit Second Banner Lines by
definition, so there is no second rendering mode to compare.

**Current guard.** Focused parsing and rendering tests cover Second Banner Lines, and
`createMarking`/`validate` tests enforce the dependent relationship between `HVCO` and
its channel text.

**Revisit when.** More authoritative examples become available, especially examples with
multiple Second Banner Line values or `HVCO` channel edge cases.
