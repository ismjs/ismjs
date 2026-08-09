# Vocabularies are generated from the vendored CVEs, and the output is committed

Every controlled vocabulary is generated from the ODNI CVE JSON files under
`references/` into `packages/core/src/generated/`, and that generated output is committed. CI
re-runs the generator and fails if the working tree changes.

## Considered Options

Hand-transcription was rejected on evidence: the previous implementation declared
`SciBanner.SI = 'SPECIAL INTELLIGENCE'` and `Banners.sci.TK = 'TALENT KEYHOLE'`, but
the official vectors show SCI controls render verbatim in banner lines
(`TOP SECRET//SI//FGI AUS//ORCON`). It also shipped 5 of roughly 200 trigraphs, and
listed `NNPI` in one table but not its twin.

Generating at build time without committing was rejected because it makes `references/`
a hard build dependency and, more importantly, destroys the reviewable diff when the DES
version changes — which is the main thing that makes tracking a moving specification
tractable.

XML was rejected as the source in favour of JSON, which carries the same deprecation
metadata (verified 18/18 on tetragraphs) without an XML parser in the build.

## Amendment: the JSON is lossy, and the XSD arbitrates

The JSON does **not** record which terms are literal tokens and which are regular
expressions. Five ISMCAT vocabularies — `OwnerProducer`, `RelTo`, `FGIOpen`,
`FGIProtected` and `Tetragraph` — admit `NATO:[a-zA-Z\-_]{1,256}`, and the JSON renders
it indistinguishably from a literal like `GBR`. Generating naively from the JSON alone
put that regular expression into the token unions as if it were a marking.

The generated XSDs do carry the distinction, as an `xsd:union` of an `xsd:pattern`
restriction and an `xsd:enumeration` restriction. Codegen therefore reads the JSON for
values, descriptions and deprecation, and the XSD purely to partition terms into
literals and patterns. Patterns are emitted as `*_PATTERNS` and are deliberately not
members of the literal union — nothing consumes them until NATO ownership is supported.

Two files are consequently read as XML rather than JSON: the `CVEGenerated/*.xsd`
schemas, and `BannerMapping.xml` (19 entries).

## Consequences

`references/` must be committed, so the `.gitignore` entry excluding it has to go. A DES
upgrade becomes: drop in the new package, re-run codegen, review the diff.
