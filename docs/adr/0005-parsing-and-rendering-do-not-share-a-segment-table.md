# Parsing and rendering do not share a segment descriptor table

This project does not drive both marking rendering and parsing from one ordered table of
segment descriptors. The two directions share vocabulary and grammar rules, but segment
identity is not symmetric enough for one descriptor abstraction to own both paths.

Rendered segments are optional, so a parser cannot identify most of them from ordinal
position alone. It must classify the content that is present. CUI categories add genuine
grammar state because their tokens overlap atomic-energy, dissemination, and non-IC
vocabularies and are identified by following a CUI marker.

Rendering has different asymmetries: dissemination combines multiple fields, foreign
government information can be omitted based on ownership, and non-US controls ride on
other segments.

## Considered Options

A shared ordered descriptor table was rejected. Supporting the real grammar would fill
it with callbacks and exceptions without removing the parser's content classification.
The resulting interface would be at least as complex as the explicit reader and renderer
while obscuring why the two paths differ.

This does not prohibit focused parser or renderer tables, shared token classifiers, or
other improvements confined to one coherent responsibility.

## Consequences

Parsing and rendering retain separate control flow and may repeat the visible ordering
of marking sections. Changes to marking syntax must still be checked in both directions
and covered by round-trip tests. A future shared abstraction must simplify the grammar's
actual asymmetries rather than merely move them behind descriptors.
