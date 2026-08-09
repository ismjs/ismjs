# ISM Codec

A library for reading and writing Information Security Markings — the strings that
appear on intelligence-community documents to declare how the information may be
handled. The definitions come from the packages vendored under `references/`.

## Sources, and what each one settles

Two authorities, and they answer different questions. Cite the one that governs.

**DoDM 5200.01, Volume 2** (`references/520001m_vol2.pdf`) — the marking manual.
Governs banner **syntax**: the order of marking categories, the separators, and
where each category sits. Enclosure 4 §1.b gives
`CLASSIFICATION//SCI//SAP//AEA//FGI//DISSEM//OTHER DISSEM`; §11 puts "OTHER
DISSEM" last; Figure 25 lists what belongs to each category.

It does **not** govern which tokens exist. It is a DoD document, and §10.a defers
intelligence markings to DNI policy — `DS` appears nowhere in it. It also cannot
place CUI: Figure 25 has no CUI category, and §10.b defers to a Volume 4 that was
never published.

**ODNI ISM.XML** (`references/ISM-…/`) — the encoding. Governs the vocabularies,
the Canonical Order within each category, the 535 rules, and the CUI segment the
manual leaves unplaced. Its XSL is an implementation of the manual's syntax, not
an independent authority for it. **This is what the library implements.**

**DoD CUI marking guidance** (`references/Cleared-CUI-Training-Aid-Markings-2024.pdf`)
— worked examples, from an authority that had no part in the ODNI stylesheets.
Useful precisely because it can disagree, and on two points it confirms: a
releasability list is `USA`, then trigraphs alphabetically, then tetragraphs; and
a pure CUI banner is never prefixed with `UNCLASSIFIED`. Both are pinned in
`test/policy-examples.spec.ts`.

On CUI itself it disagrees, and the library follows ISM.XML — see
`docs/risks.md`. Do not cite it for how a CUI segment renders.

**The ISOO CUI Registry** (archives.gov) — the government-wide list of CUI
categories and Limited Dissemination Controls. Live, so it cannot be vendored or
pinned: use it to **check** generated data, never to generate it. Everything in
`src/generated/` comes from `references/`, which is committed, and ADR-0003
depends on that staying true.

Where these overlap they agree. Where a comment can cite policy rather than a
stylesheet, it should.

## Language

**Marking**:
The set of security facts a marking string can carry, independent of how it is
rendered. This is a strict subset of the ISM attribute set — it excludes anything
no string can express.
A Marking never holds an empty multi-valued field: `createMarking` drops one
rather than keeping it, so a field is present or absent and never both. Code
reading a Marking therefore tests `=== undefined`. Code reading the plain input a
caller supplied cannot — an empty array is a thing a caller can pass — which is
why `markingKind` counts and `leadsWithCui` does not.
_Avoid_: ISM object, security marking, classification (too narrow), ISMObj

**Banner Line**:
The rendering of a Marking as full words, placed at the top and bottom of a
document. `SECRET//SI//FGI AUS//ORCON-USGOV`
_Avoid_: banner marking, overall classification, header

**Portion Mark**:
The rendering of a Marking as abbreviated tokens in parentheses, placed against an
individual paragraph, title or image. `(TS//SI//FGI AUS//OC-USGOV)`
_Avoid_: portion, short marking, abbreviated marking

**Classification Authority Block**:
The separate block of text declaring who classified a document and when it may be
declassified — `classifiedBy`, `derivedFrom`, `declassDate`, `classificationReason`.
Part of the ISM attribute set but _not_ part of any Marking, because no marking
string can express it.
_Avoid_: security banner attributes, declass block, authority attributes

**Rollup**:
Deriving a document's overall Marking from the Markings of its constituent parts.
Rollup is where information is deliberately destroyed — three distinct SAR
identifiers roll up to `SAR-MULTIPLE PROGRAMS`, and that collapse cannot be undone.
_Avoid_: aggregation, overall marking computation, summarisation

**CUI**:
Controlled Unclassified Information — a marking category carried inside a Marking
rather than alongside it. Appears as its own segment (`CUI//SP-AIV`), and may lead
the string outright when nothing classified is present.
_Avoid_: FOUO, SBU, controlled, sensitive-but-unclassified

**Commingled Marking**:
A Marking carrying both a classification and CUI at once —
`SECRET//CUI//PROPIN//NOFORN`. Distinct from a pure CUI Marking, which has no
classification segment at all.
_Avoid_: mixed marking, hybrid marking, dual marking

**Marking Kind**:
Whether a Marking is classic IC, pure CUI, or Commingled. Not a presentation
choice — the kind selects which controlled vocabulary governs the Marking, and
therefore what canonical order its dissemination controls take.
_Avoid_: marking type, style, flavour, profile

**Canonical Order**:
The one correct stored sequence for a Marking's multi-valued fields, fixed by the
governing vocabulary for its Marking Kind. It governs the Marking value, not the
placement of those values in a rendered string.
_Avoid_: sort order, ordering, natural order

**Presentation Order**:
The sequence in which a Marking's values appear in a Banner Line or Portion Mark.
It may differ from Canonical Order only where marking syntax requires a lossless
rearrangement; it never changes token membership.
_Avoid_: canonical order, normalization, consumption

**Owner-Producer**:
The countries or organisations that own the information a Marking describes. Not
metadata about the Marking — it changes how the Marking renders, since a
foreign-owned Marking leads with its owners (`//GBR SECRET`) where a US-owned one
does not.
_Avoid_: owner, producer, originator, source country

**Joint Marking**:
A Marking owned by more than one country and explicitly declared joint, rendered
with its owners named after the classification — `//JOINT SECRET DEU USA`.
Distinct from a Marking that merely has several Owner-Producers.
_Avoid_: multinational marking, shared marking, coalition marking

**Compartment**:
A subdivision of a control, written as a suffix on its parent token — `RSV-ABC`
is a compartment of `RSV`, `SI-G-ABCD` a subcompartment of `SI-G`. Depth is
counted in hyphens and determines how siblings are joined when rendered.
_Avoid_: sub-control, child marking, compartmented marking

**Stem**:
The registered control a token is built on — the longest vocabulary entry the token
either equals or extends with a hyphen. `SI-G-ABCD` stems from `SI-G`, not `SI`,
because a Compartment hangs off the most specific control that admits it. A token
orders and supersedes by its stem.
_Avoid_: root, base, parent, prefix

**Supersession**:
Two controls being mutually exclusive, so that one displaces the other outright.
**No such relation exists in a Marking.** The term is kept because it is the
obvious wrong model: `OC` beside `OC-USGOV` looks like displacement and is
Consumption, which cost two corrections to establish. Mutual exclusion between
tokens is real, but it is an error to report rather than a value to drop — see
`validate`.
_Avoid_: overriding, precedence, shadowing, absorption

**Consumption**:
A control being absorbed into the rendering of a more specific one rather than
appearing separately. `SI SI-G SI-G-ABCD` renders as `SI-G ABCD` — `SI` is not
dropped, it supplies the head of `SI-G`. `OC` beside `OC-USGOV` is the same
relation: the attribute set carries both, ISM-ID-00302 requires both, and only
`OC-USGOV` renders. Consumption is always a rendering step, never a
normalisation, so `parse` restores what it consumed.
_Avoid_: merging, collapsing, folding, rollup, supersession

**Control/Decontrol Block**:
The block of text declaring who controls a piece of CUI and when it decontrols.
The CUI counterpart to the Classification Authority Block, and likewise not part
of any Marking.
_Avoid_: CUI block, decontrol notice, CUI authority block
