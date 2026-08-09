# Marking is the string-expressible projection, not the ISM attribute set

The ISM attribute set carries roughly forty attributes, but a banner line or portion
mark can only express about sixteen of them — 69 of the 189 official test vectors
(36%) contain attributes such as `derivedFrom`, `declassDate`, `classificationReason`
and `cuiControlledBy` that no marking string can represent, because they belong to the
Classification Authority Block rather than the marking. We therefore define `Marking`
as exactly the expressible subset, so that `parse` and `format` are genuine inverses.

## Consequences

`parse(format(m)) === m` holds for every canonical Marking, with five exceptions listed
in the README. This ADR originally claimed no exceptions. That was wrong, and it took
three corrections to establish: the exceptions are places the marking string itself holds
less than the attribute set, not places `parse` is incomplete.

`EXEMPT_FROM_ICD501_DISCOVERY` was a sixth until this ADR's own definition ruled it out —
it is in the CVE and in the attribute set, but no string renders it, so it was never part
of a Marking. `RenderableDissemControl` excludes it.

The cost is that rules referencing the authority block cannot be evaluated — this rules
out 152 of the 535 Schematron rules. Supporting them later means introducing a wider
type that contains a Marking, not widening `Marking` itself.

## `Marking` is not discriminated on Marking Kind

The obvious next move is to make `Marking` a discriminated union over
`'ic' | 'cui' | 'commingled'`, so that a pure-CUI Marking is structurally distinct from
a classic one. We deliberately do not.

Marking Kind is a **total function of the other fields**: every combination of fields
maps to exactly one kind, and no combination is illegal — a Marking carrying CUI and a
SECRET classification is not invalid, it is Commingled. A union would therefore partition
an already-total space, forcing every caller to narrow without excluding a single
unrepresentable state, and would introduce a second source of truth that could disagree
with the fields it was derived from.

`markingKind()` derives it on demand instead. The invariants the type system _can_ carry
are carried: `Canonical<T>` for ordering, and `CanonicalNonEmpty<T>` for `ownerProducer`,
which ISM requires to hold at least one value.
