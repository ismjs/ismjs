# Marking Rollup is a separate package and Resource Rollup remains separate

`@ismjs/rollup` owns pure, batch-oriented derivation over an explicit set of canonical
`Marking` values. It exposes Classification High-Water and USA-target Marking Rollup,
while a future Resource capability owns tree traversal, contribution selection, and
document-only metadata. Keeping those operations separate lets the first package remain
transport-neutral without widening `Marking` or inventing a partial Resource model.

Marking Rollup preserves unanimous contributor ownership. Mixed ownership requires an
explicit Rollup Target Ownership because contributor origin does not uniquely determine
who produced a derivative work. Explicit target ownership may differ from unanimous
contributors, but that produces a warning; foreign and NATO contributor origins still
participate in FGI derivation. The first supported target profile is USA ownership.

Executable XSLT, passing XSpec scenarios, Schematron, and published policy are primary
authority evidence. A pending XSpec scenario records an unresolved intention but cannot
authorize behavior by itself. Fields without sufficient evidence fail explicitly rather
than being copied, unioned, or discarded.

## Considered Options

Putting Rollup in `@ismjs/core` was rejected because a lossy many-to-one derivation is a
different capability from the strict single-Marking codec. Requiring a Resource tree for
every Rollup was rejected because callers such as marking builders already possess an
explicit contributor set. Deriving arbitrary output ownership by union or intersection
was rejected because it conflates source origin with derivative ownership; the legacy
package's broader ownership heuristic was largely untested and can invent or erase
ownership. A general IC-or-DoD Rollup policy was rejected until authority evidence shows
that Marking derivation itself varies.

## Consequences

`rollupMarkings` is a whole-batch operation and makes no associativity guarantee.
Expected domain failures are reported as `RollupIssue` values rather than exceptions or
partial Markings. `highestClassification` remains public for builder use and preserves
`R`; USA-target Marking Rollup promotes `R` to `C`. Resource Rollup, NATO-owned output,
arbitrary foreign targets, `displayOnlyTo`, Notices, Need-To-Know, authority blocks, and
NATO High-Water metadata remain later capabilities.
