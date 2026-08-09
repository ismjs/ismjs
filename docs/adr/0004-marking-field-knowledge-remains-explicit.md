# Marking field knowledge remains explicit

This project does not centralize all `Marking` field metadata in one registry. Field
names recur across admission, normalization, validation, arity, and assembly, but those
uses do not all represent the same knowledge.

Some fields use a fixed generated vocabulary. Dissemination ordering depends on Marking
Kind. Several fields admit both literal and pattern terms, ownership is non-empty, and
scalar fields have no vocabulary at all. The assembly paths are deliberately explicit
so TypeScript can prove their results without assertions.

## Considered Options

One registry covering every field and consumer was rejected. Its interface would need
to expose each semantic exception, while iteration over heterogeneous definitions would
tend to replace precise inferred token types with casts. Callers would still need to
understand the exceptions as well as the registry, making it a shallow metadata module
rather than a deeper abstraction.

This decision does not prohibit small derived types or focused exhaustive maps. Those
remain appropriate when their entries share one meaning and compiler-proven types are
preserved.

## Consequences

Some field lists remain visibly repeated. A maintainer should not consolidate them
merely because their keys overlap; first establish that they encode the same domain
fact and can retain the existing type guarantees. New consumers should own the narrowest
field knowledge they require.
