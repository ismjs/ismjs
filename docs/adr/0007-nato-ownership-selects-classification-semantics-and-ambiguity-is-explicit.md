# NATO ownership selects classification semantics and ambiguity is explicit

`Marking` remains source-shaped: `classification`, `ownerProducer`, and `joint` store
authority facts, while ownership selects their rendering semantics. The public type is a
distributed union rather than a flat classification widening or a stored ownership-regime
discriminator. Existing ownership branches retain US Classification; sole `NATO`
ownership admits NATO Classification `TS`, `S`, `C`, `R`, or `U`; and sole NATO Special
Word ownership admits `S`, `C`, `R`, or `U`. `MarkingInput` transforms that union
distributively.

The authority's complete NATO Special Word pattern is supported. Banner Lines preserve
every Special Word, while Portion Marks preserve only values with authority-defined
abbreviations generated from `nacs.xml`. A Portion Mark that erases an unabbreviated
Special Word is an explicit information loss. A string with multiple authority-valid
interpretations returns `IssueCode.Ambiguous`; parsing never selects one by precedence.

NATO High-Water Values remain outside `Marking`. They summarize NATO content for resource
rollup and access control rather than selecting a Marking's primary classification
wording, and authority rules prohibit them for sole `NATO` ownership. The discrepancy
between the schema's rendering annotation and the supplied rendering XSLT is deferred to
future resource-model research.

## Considered Options

A flat `UsClassification | NatoClassification` field was rejected because it would admit
invalid combinations throughout the existing API. A stored `ownershipRegime` was
rejected because it would duplicate and potentially contradict `ownerProducer`. Keeping
the name `NatoSubOrganisation` was rejected because the authority pattern does not imply
an organisation; the pre-1.0 API will instead make the clean breaking rename to
`NatoSpecialWord` without an alias.

Restricting support to the four abbreviated Special Words was rejected because the
authority admits the complete pattern and renders every value in Banner Lines. Guessing
an inverse interpretation for colliding Banner syntax was rejected because the authority
provides a renderer but no precedence-bearing inverse grammar. Treating `highWaterNATO`
as the NATO-owned classification was rejected because its rollup purpose and validation
rules establish a different domain concept.

## Consequences

NATO-owned rendering and parsing can be added without weakening existing US contracts or
inventing a second source model. Sole NATO Special Word ownership cannot use `TS`.
Mixed-country and NATO ownership remains representable, but a genuinely ambiguous
rendered string can fail parsing even though it is well-formed. `profileFor` remains
US-classification-specific; NATO deployments use an explicit Profile.

Validation implements only rules whose complete inputs survive the Marking projection.
The 20 official NATO vectors become active evidence, including asserted ambiguity and
information-loss paths. Completing SAP and NATO removes the known capability-deferred
corpus gap, but is not by itself a declaration that the project is ready for a 1.0.0
release.
