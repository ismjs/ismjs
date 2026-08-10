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
For a Special Access Program, a Marking carries only the projected SAP Program
expression (for example `SAR-ABC`), never the SAR Identifier's source authority or
required classification because a marking string cannot reconstruct them.
Validation over a Marking claims an authoritative rule only when every input to that
rule survives this projection; rules requiring discarded SAR metadata or
`compliesWith` remain resource-level rules.
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
Rollup operates on a document tree and may deliberately destroy information, so it is
separate from the single-Marking codec. `SAR-MULTIPLE PROGRAMS` is not a Rollup result:
it is a lossy DoD Banner rendering of program facts that remain present in the Marking.
_Avoid_: aggregation, overall marking computation, summarisation

**Special Access Program (SAP)**:
A defense or intelligence program whose information requires access controls beyond
those normally required at its classification level.
_Avoid_: SAR, SAR Identifier, program marking

**SAR Identifier**:
An ISM attribute token that identifies a Special Access Program by source authority,
optional required classification, and program expression — `SAR-DOD:S:ABC`.
Projecting it into a Marking discards the authority and required classification,
leaving only the string-expressible program expression — `SAR-ABC`.
_Avoid_: SAP, SAR, SAR marking

**SAP Program Expression**:
The projected, string-expressible program value stored in a Marking. Every expression
retains its `SAR-` prefix — `SAR-DEMO-SAP99` — but carries no source authority or
required classification. Under IC SAP Rendering Policy its dashes express hierarchy;
under DoD SAP Rendering Policy they are opaque program-name characters.
_Avoid_: SAR Identifier, SAR Segment, raw SAP value, program name

**SAR Segment**:
The string-visible rendering of one or more Special Access Programs in a Banner Line or
Portion Mark — `//SAR-ABC/DEF`.
_Avoid_: SAR Identifier, SAP attribute, SAR field

**SAR Summary**:
The DoD Banner Line rendering `SAR-MULTIPLE PROGRAMS`, used when a Marking carries more
than two distinct Special Access Programs. It conceals their identities in that Banner
Line; a Portion Mark still renders every program. A SAR Summary is not a program value
and never belongs in a Marking, so `parse` can recognize it but cannot reconstruct the
source Marking.
_Avoid_: SAP, SAR Identifier, Rollup result, program expression

**Rendering Policy**:
The independent choices that govern how a codec renders and interprets a Marking.
Rendering Policy is operation context: it is neither a security fact carried by the
Marking, document-compliance metadata, nor a validation Profile. Its SAP choice is
implemented first; a future CUI choice may vary independently.
_Avoid_: document profile, compliance policy, validation profile, rendering mode

**SAP Rendering Policy**:
The IC-or-DoD choice within Rendering Policy that governs how the codec renders and
interprets a SAR Segment. The parser enforces the selected grammar and never infers the
policy from the string; an omitted choice defaults to IC. It varies independently of
any future CUI rendering choice.
_Avoid_: SAP style, SAP mode, SAPRenderingRuleSet, document policy

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

**NATO-Owned Marking**:
A Marking whose sole Owner-Producer is `NATO` or one NATO Special Word. That ownership
regime selects NATO classification syntax; merely naming NATO in releasability, FGI, or
a non-US control does not make a Marking NATO-owned.
_Avoid_: NATO Marking, NATO-related Marking, Marking containing NATO

**NATO Classification**:
The `TS`, `S`, `C`, `R`, or `U` classification of a NATO-Owned Marking, whose NATO
wording is selected by ownership. It is not a `NATO-TS` through `NATO-U`
`highWaterNATO` value; those values summarize the highest NATO classification represented
for rollup and access-control purposes rather than selecting the Marking's primary
classification wording.
_Avoid_: high-water NATO, NATO classification prefix, NATO-TS

**NATO High-Water Value**:
A `NATO-U`, `NATO-R`, `NATO-C`, `NATO-S`, or `NATO-TS` resource value summarizing the
highest NATO classification represented among relevant portions for rollup and
access-control purposes. It is not a Marking's primary classification and is prohibited
when the sole Owner-Producer is `NATO`.
_Avoid_: NATO Classification, NATO ownership classification, classification prefix

**NATO Special Word**:
An authority-defined `NATO:<text>` Owner-Producer or entity expression, such as
`NATO:ISAF` or `NATO:ABC`; the pattern does not imply that the text names an
organisation. Every Special Word renders fully in a Banner Line, but a Portion Mark can
preserve only the four values with authority-defined abbreviations.
_Avoid_: NATO sub-organisation, NAC, NATO command, NATO organisation

**Ambiguous Marking String**:
A valid Banner Line or Portion Mark with more than one authority-valid Marking
interpretation because the rendered syntax erased a boundary, such as a NATO Special
Word colliding with multiple Owner-Producers. It is not malformed, but no parser can
recover one source Marking without guessing.
_Avoid_: malformed marking, unknown marking, information-loss summary

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
orders by its stem.
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
