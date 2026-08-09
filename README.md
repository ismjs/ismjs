# ismjs

ismjs is a dependency-free TypeScript codec for Information Security Markings: Banner
Lines and Portion Marks used to label classified and controlled information in U.S.
government systems.

```text
SECRET//NOFORN      Banner Line
(S//NF)             Portion Mark
```

It reads, writes, canonicalizes, and validates classic IC, CUI, and Commingled Markings.
It ships as ESM, CommonJS, and a self-contained file for air-gapped networks.

> [!IMPORTANT]
> This library implements ODNI ISM.XML rendering. DoD CUI marking guidance differs,
> especially for Banner Lines. Read [Known risks](./docs/risks.md) before using its
> output on a DoD document.

## Install

```sh
npm install @ismjs/core
```

## API

The library has 4 core functions:

| Function        | Accepts             | Returns                                                |
| --------------- | ------------------- | ------------------------------------------------------ |
| `parse`         | a marking string    | a Marking, or the reasons it could not read the string |
| `format`        | fields or a Marking | a Banner Line or Portion Mark                          |
| `validate`      | a string or fields  | every issue found                                      |
| `createMarking` | fields              | a Marking in Canonical Order                           |

`validate` accepts a string because unreadable input can be returned as another issue.
`format` and `createMarking` return values, so they accept fields rather than strings.
Use `parse` when you need to turn a string into a Marking.

### Read a marking

`parse` reads a marking string.

```ts
import { parse } from '@ismjs/core'

const result = parse('SECRET//NOFORN')

if (result.ok) {
  result.marking.classification // 'S'
  result.marking.disseminationControls // ['NF']
} else {
  result.issues // the reasons the library cannot read the string
}
```

`parse` gives you a **Marking**: the set of security facts that a marking
string can hold.

The result has 3 SCI controls, but the string shows 1. A marking string shows only the
last part of each control. It gets the other parts from the parent controls. The library
puts the parent controls back.

### Write a marking

`format` accepts plain fields. It does not need a Marking.

```ts
import { format, RenderMode } from '@ismjs/core'

format(
  { classification: 'S', ownerProducer: ['USA'], disseminationControls: ['DSEN', 'NF'] },
  RenderMode.Banner,
) // 'SECRET//NOFORN/DEA SENSITIVE'

format(result.marking, RenderMode.Portion) // '(TS//SI-G ABCD//FGI DEU//OC-USGOV/NF) '
```

The first example gives `NOFORN/DEA SENSITIVE`, but the input has the other sequence.
`format` puts the fields in **Canonical Order** first. Canonical Order is the one correct
sequence for a field with more than 1 value. The controlled vocabulary sets that
sequence. It is not a preference.

The applicable vocabulary changes with the marking. A classic IC marking, a pure CUI
marking and a marking with both do not use the same sequence.

### Check a marking

`parse` tells you if the library can read a string. `validate` tells you if the rules
permit the marking.

`validate` accepts a string or a set of fields.

```ts
import { validate } from '@ismjs/core'

validate('(TS//RD) ')
// [{ code: 'inconsistent', ruleId: 'ISM-ID-00467', field: 'disseminationControls',
//    message: 'RD in atomicEnergyMarkings requires disseminationControls to hold one of NF', … }]

validate({ classification: 'S', ownerProducer: ['USA'], disseminationControls: ['REL', 'NF'] })
// [{ code: 'mutually-exclusive', ruleId: 'ISM-ID-00033', … },
//  { code: 'inconsistent', ruleId: 'ISM-ID-00031', … }]
```

Issues produced by an ODNI rule carry its official `ISM-ID`. Syntax, ordering, and local
profile issues have no rule ID because they do not come from that rule corpus.

**`result.ok` from `parse` shows that the library read the string. It does not show that
the marking is legal.** A marking on a document can be readable and break many rules. Use
`validate` for the second question.

`parse` does not apply the rules, and `format` does not apply them. There are 2 reasons:

- `validate` cannot report a retired token until it knows the date of the document. A
  `parse` that applied the rules must then have that date, or it must ignore those rules.
- A marking builder makes a string after each keystroke. Most of those markings are not
  complete. `format` must always give you a string.

To report a retired token, give `validate` the date of the document:

```ts
validate(marking, { createdOn: '2024-01-01' })
```

The library uses the same test as the reference implementation:

| The document date is | The library reports |
| -------------------- | ------------------- |
| after the retirement | an error            |
| on or before it      | a warning           |
| not supplied         | nothing             |

### Restrict what a deployment can issue

An application on a SECRET network must not offer `MVL`. `MVL` needs TOP SECRET.

A **profile** sets the limit. The library calculates most of a profile from the rules.

```ts
import { profileFor } from '@ismjs/core'

validate(marking, { profile: profileFor('S') })
// [{ code: 'outside-profile', field: 'SCIcontrols', token: 'MVL', … }]
```

The library cannot calculate local policy. The specification does not say which
compartments a site can use. Write those profiles by hand:

```ts
validate(marking, { profile: { SCIcontrols: { allow: ['SI', 'SI-G'] } } })
```

Free-form Compartment expressions can be restricted with `allowPatterns` or
`denyPatterns`. Existing literal-only `allow` and `deny` profiles remain valid.

**A profile is not a security control.** It changes what a user interface offers, and
what `validate` accepts. Any caller can omit it. The network keeps the enclaves apart.

### Make a Marking

`createMarking` makes a Marking from plain fields. `format` applies the same construction
contract internally; `validate` reports contract violations as issues instead. Use
`createMarking` when you want the object, not the string.

```ts
import { createMarking } from '@ismjs/core'

const marking = createMarking({ classification: 'S', ownerProducer: ['USA'] })
```

`HVCO` and its channel text are one dependent value. Channels must be non-empty, must
not contain `/`, `|`, or line breaks, and cannot appear unless `HVCO` is present:

```ts
const marking = createMarking({
  classification: 'S',
  ownerProducer: ['USA'],
  secondBannerLine: ['HVCO'],
  handleViaChannels: 'ALPHA BRAVO',
})
```

`createMarking` rejects an unrepresentable pair, while `validate` returns an
`inconsistent` issue for it. A Portion Mark deliberately omits every second Banner Line.

`createMarking` is the public constructor for making a Marking from fields. `parse` also
returns a Marking after checking and canonicalizing a string. Code below either boundary
can rely on Canonical Order. See
[ADR-0002](./docs/adr/0002-canonical-order-via-branded-arrays.md).

## The round-trip law

```text
parse(format(marking, mode)).marking ≡ marking
```

The equality here is structural, not JavaScript reference identity. It holds for each
Marking in Canonical Order, with 5 explicit exceptions where a marking string cannot
carry the complete input value.

| Construct                                          | Why the library cannot get it back                      |
| -------------------------------------------------- | ------------------------------------------------------- |
| `FGIsourceProtected` with the names of countries   | the marking exists to hide those names                  |
| `FGIsourceOpen` when the USA does not own the data | only a US-controlled document shows FGI                 |
| a non-US control with no host segment              | `ATOMAL` goes on atomic energy, `BOHEMIA`/`BALK` on SCI |
| a second banner line on a portion mark             | a portion mark has no second banner line                |
| a bare `NATO` in an FGI list, with more after it   | `FGI NATO PSMX` is also `NATO:PSMX`                     |

The test suite asserts each exception. It does not skip them. If the library gets one of
these constructs back, the test fails and the exception goes away.

Three of the five loss categories occur in the official corpus, across six renderings.
Dedicated examples assert all five categories, including the two only generated Markings
currently exercise.

`EXEMPT_FROM_ICD501_DISCOVERY` was a sixth exception. The CVE has it, and the attribute
set has it, but no string shows it. Thus it is not part of a Marking, and the type
excludes it.

## Where the data comes from

A script makes each vocabulary, sequence and rule from the ODNI packages in
`references/`. No person copies them. CI runs the script again, and fails if the result
changes. See [the architecture](./ARCHITECTURE.md#authority-and-generation) and
[ADR-0003](./docs/adr/0003-vocabularies-are-generated-and-committed.md).

The repository's trust model is deliberately simple:

- The packages in `references/` are the authority. This code is not.
- A script creates every file in `packages/core/src/generated/`; no person edits them.
- The tests state the behavior that has actually been verified.

| Package    | Version                                           |
| ---------- | ------------------------------------------------- |
| ISM.XML    | V2021-NOV r2022-NOV (`specVersion` 202111.202211) |
| ISMCAT.CES | 202205                                            |

The library exports these versions as `SPEC_VERSION`. The script reads them from the
packages.

`references/` also holds 2 documents no script reads. DoDM 5200.01, Volume 2 gives the
order of the marking categories, which the ODNI stylesheets only implement. The DoD CUI
marking guidance gives worked examples from an authority that had no part in those
stylesheets. The code cites both where a comment would otherwise cite a stylesheet. See
[CONTEXT.md](./CONTEXT.md) for which source settles which question.

**This library writes markings the way ISM.XML does.** DoD guidance marks CUI
differently, particularly on the Banner Line.

## Coverage

A script takes the test vectors from the ODNI XSpec suites. The tests use those vectors.

|                                  |                                   |
| -------------------------------- | --------------------------------- |
| Vectors in `ISM-Rollup/XSPEC/**` | 189                               |
| Deferred (30 SAP, 20 NATO-owned) | 50                                |
| **v1 target**                    | **139**                           |
| Correct output                   | **139 / 139** (272 / 272 strings) |
| Exact round-trip identity        | **266 / 272 renderings**          |
| Asserted deliberate loss         | **6 / 272 renderings**            |

One vector cannot become a Marking. It releases to a tetragraph that no register holds.
The tests list it as an exception. They do not skip it quietly.

`fast-check` also makes Markings from the same vocabularies, and applies the same law.
This found 5 defects that the vectors did not. For example, the library cannot identify
CUI categories by their content: `PROPIN` is a CUI category, and it is also how a banner
line writes the dissemination control `PR`.

A second file holds 111 portion marks that are correct. The library reads each one,
writes it again with no change, and reports no issue. These markings do not come from
this library, and they do not come from the ODNI vectors.

## Scope

**v1 has** classic IC and CUI markings. It has USA, foreign and JOINT ownership. It has
`classification`, `SCIcontrols` with compartments, `atomicEnergyMarkings`,
`disseminationControls`, `releasableTo`, `displayOnlyTo`, FGI, `nonICmarkings`,
`nonUSControls`, `cuiBasic`, `cuiSpecified` and `secondBannerLine`.

**v1 does not have** Special Access Programs, Rollup, NATO ownership, Notices,
Need-To-Know, the Classification Authority Block, the Control/Decontrol Block, or XML.
See [docs/roadmap.md](./docs/roadmap.md).

`validate` applies 109 of the 535 ODNI rules: vocabulary membership, mutual exclusion,
retired tokens, and rules between 2 fields. Most of the other rules need a document, not
a Marking.

`ISM-ID-00267` is less strict here than in the specification. That rule refuses
`SI-G-ABCD`, but the ODNI vectors contain that token. See
[docs/risks.md](./docs/risks.md).

## Artifacts

| File                   | Use it for                                              |
| ---------------------- | ------------------------------------------------------- |
| `dist/index.mjs`       | ESM                                                     |
| `dist/index.cjs`       | CommonJS                                                |
| `dist/ismjs.global.js` | a `<script>` tag, with no module system. ~11 kB gzipped |

The test suite loads all 3 files in the same way that a consumer loads them.

The display labels are a different entry point. The codec does not read them.

```ts
import { TRIGRAPH_DESCRIPTIONS, CUI_DESCRIPTIONS } from '@ismjs/core/descriptions'
```

Know these 2 facts before you show a label to a user:

- The CUI descriptions are sentences, not labels. 121 of the 123 are longer than 60
  characters. Each one starts with a name, then explains the category.
- 8 of the 20 SCI controls describe themselves. The description of `BUR` is `BUR`. Show
  the token when this occurs.

## Compatibility with the earlier `ismjs`

An earlier `ismjs` was distributed to air-gapped networks as vendored files alongside
`ismjs-rollup` and `ismjs-react`. `@ismjs/core` solves the same problem with a new API;
it is not a drop-in replacement. Install and import the scoped package name.

The library exports both its own version and the ODNI edition it encodes, so a copied
artifact can identify itself:

```js
import { VERSION, SPEC_VERSION } from '@ismjs/core'

VERSION // this library
SPEC_VERSION // the ODNI edition of the specification
```

New packages use the `@ismjs` scope. See the [roadmap](./docs/roadmap.md) for planned
packages and deferred capabilities.

## Documentation

- [CONTEXT.md](./CONTEXT.md) — the project vocabulary; read this first when contributing
- [ARCHITECTURE.md](./ARCHITECTURE.md) — runtime flows, module boundaries, generation,
  testing, and published artifacts
- [CONTRIBUTING.md](./CONTRIBUTING.md) — layout, workflow, generated files
- [docs/roadmap.md](./docs/roadmap.md) — what the library does not do, and what each part
  needs
- [docs/risks.md](./docs/risks.md) — what can be wrong
- [docs/adr/](./docs/adr/) — the decisions that control the code

## AI disclosure

This project was developed with assistance from AI tools for brainstorming, code
generation, refactoring, testing, and documentation. All AI-assisted output is reviewed
and validated before inclusion. Maintainers and contributors remain responsible for
understanding and verifying everything they submit.

## Licence

MIT. See [LICENSE](./LICENSE). The packages in `references/` are US Government works.
The ODNI packages are marked _"approved for Public Release and available for use without
restriction."_ DoDM 5200.01, Volume 2 states its own releasability at paragraph 7:
_"Cleared for public release."_ The CUI marking guidance is cleared for open publication
as DOPSR 25-P-0275.
