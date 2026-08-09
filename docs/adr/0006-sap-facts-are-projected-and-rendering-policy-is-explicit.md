# SAP facts are projected and rendering policy is explicit

A raw SAR Identifier carries a source authority, an optional required classification,
and a program expression, but Banner Lines and Portion Marks render only the program
expression. `Marking` therefore stores projected SAP Program Expressions in
`specialAccessPrograms`, while the IC-or-DoD SAP Rendering Policy is explicit operation
context supplied to `parse` and `format`. It is not stored as a security fact. Rendering
Policy has independent axes so a future CUI choice can vary without redefining SAP
semantics; omitted SAP policy defaults to IC.

## Considered Options

Storing raw SAR Identifiers was rejected because `parse` cannot reconstruct their
authority or required classification. A flat IC-or-DoD document profile was rejected
because the authoritative stylesheets vary SAP and CUI rule sets independently, and the
codec does not yet implement DoD CUI rendering. Storing `SAR-MULTIPLE PROGRAMS` as a
sentinel was rejected because it would create a partial Marking that could reproduce a
Banner Line but not the required full Portion Mark.

## Consequences

The same dashed SAR Segment can represent different facts under different policies: IC
parsing restores hierarchical ancestors, while DoD parsing treats the dashes as opaque.
The parser enforces the selected grammar rather than inferring a policy. A DoD Banner
Line containing `SAR-MULTIPLE PROGRAMS` is recognized but returns an information-loss
failure because the source program identities are absent. Validation claims only rules
whose complete inputs survive projection; rules requiring SAR authority, required
classification, or `compliesWith` remain resource-level rules.
