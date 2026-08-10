# Contributing

Contributions should preserve the repository's central trust boundary: vendored
authorities supply data, generators derive committed source and fixtures, and handwritten
runtime code supplies the codec behavior that cannot be generated.

Before changing the implementation, read:

- [CONTEXT.md](./CONTEXT.md) for the domain vocabulary;
- [ARCHITECTURE.md](./ARCHITECTURE.md) for runtime flows and module ownership;
- [docs/adr/](./docs/adr/) for decisions that still constrain the code;
- [docs/risks.md](./docs/risks.md) when changing CUI, validation, authority inference, or
  corpus behavior.

## Requirements and setup

The repository uses Bun 1.3.14 and Node 24 or newer; CI pins Node 24. Node runs
TypeScript files under `packages/*/scripts/` directly through native type stripping, so
those files require no build step.

```sh
bun install --frozen-lockfile
bun run check
```

Use `bun install` without `--frozen-lockfile` only when intentionally changing
dependencies and `bun.lock`.

The two verification levels are:

| Command              | Purpose                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `bun run check`      | Fast loop: formatting, lint, types, and tests against the current workspace                 |
| `bun run check:full` | Release gate: build, coverage, generated-source drift, corpus drift, and package validation |

Run `check` while working and `check:full` before handing off a change. CI runs the full
gate for pull requests and pushes to `main`.

## Commit messages

Every commit in a pull request must follow Conventional Commits. The type determines the
release impact when a commit lands on `main`: `fix:` triggers a patch, `feat:` triggers a
minor, and `!` marks a breaking change. Types such as `docs:`, `test:`, `refactor:`, and
`chore:` do not trigger a package release.

```text
docs: clarify NATO ownership
feat(core): add NATO classification
fix(parser)!: reject ambiguous ownership
```

Check the latest local commit before pushing:

```sh
bun run commitlint --last --verbose
```

The pull-request workflow checks every commit introduced by the branch and reports each
nonconforming subject.

## Repository layout

```text
references/                    committed, pinned authority material
lint/plugin.js                 project-local oxlint rules
docs/adr/                      durable architectural decisions
packages/
  core/                        @ismjs/core
    scripts/                   code generation, rule harvesting, corpus harvesting
    src/generated/             generated and committed; never hand-edited
    src/                       handwritten runtime code
    test/fixtures/vectors.json generated and committed official corpus
    test/                      focused, corpus, property, and artifact tests
```

New publishable packages belong under `packages/`. `references/` stays at the repository
root because it is provenance for the project rather than private data owned by
`@ismjs/core`.

## Know which file owns a change

| Change                                                                 | Source of truth                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A vocabulary value, order, description, spelling, or authority version | The relevant file under `references/` and its generator under `packages/core/scripts/` |
| Generated TypeScript is wrong                                          | The generator; never patch `src/generated/` directly                                   |
| An official XSpec vector is missing or wrong                           | `harvest.ts` or its parsing helpers; never patch `vectors.json` directly               |
| Parsing, rendering, normalization, or validation behavior is wrong     | The focused handwritten module identified in `ARCHITECTURE.md`                         |
| A term is unclear or inconsistent                                      | `CONTEXT.md`, which is a glossary rather than an implementation spec                   |
| A durable, non-obvious trade-off changes                               | Add or amend an ADR as well as the implementation                                      |

Keep generated data and handwritten behavior on their respective sides of this boundary.
A specification update can change both, but the generated diff must still be explainable
from the updated authority and generator.

## Generated code and fixtures

Two outputs are generated and committed:

- `packages/core/src/generated/`
- `packages/core/test/fixtures/vectors.json`

Regenerate them from the repository root:

```sh
bun run codegen   # references/ -> packages/core/src/generated/
bun run harvest   # ODNI XSpec -> packages/core/test/fixtures/vectors.json
```

After regeneration, review and commit the output diff. A changed authority file with no
corresponding generated diff can be as suspicious as an unexplained generated diff.
`check:full` reruns both pipelines and fails on modified or untracked output.

Tokens are emitted as ordered arrays, with union types derived from those arrays.
Description tables use `satisfies Readonly<Record<Token, string>>`, so missing and unknown
labels fail type checking. Display descriptions remain a separate package entry point and
must not become a runtime codec dependency.

Only the authority files used by generators or cited by source are tracked. The
`.gitignore` explains the exclusions. If a source comment cites a new authority file,
that file must be committed; add a narrow ignore exception when necessary.

## Implementation standards

The ordinary formatter, linter, and strict TypeScript settings are part of the design,
not cleanup to defer until the end. Project-specific rules also prohibit:

- `as never`, because it can force any value through a `never` boundary;
- `as unknown as T`, because it discards the relationship between the source and target
  types;
- non-null assertions.

Prefer deriving a type from the vocabulary that admits a value, checking untrusted data,
or rebuilding a precisely typed record. The two unavoidable phantom-brand assertions
live in `packages/core/src/canonical.ts`; new brand mints should not appear elsewhere.

Preserve the public operation boundaries:

- `parse` answers what a string says;
- `format` renders fields without applying validation policy;
- `validate` reports every supported rule violation;
- `createMarking` constructs the canonical value from fields.

Do not merge these behaviors for convenience. Their separation is part of the public
contract and is explained in the architecture document.

## Tests

Run one file during development with Vitest's path filter:

```sh
bun run test -- packages/core/test/parse.spec.ts
bun run test:watch
```

The main evidence suites are:

| File                      | Covers                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| `vectors.spec.ts`         | Shape and accounting of all 189 harvested ODNI vectors                     |
| `format.spec.ts`          | Both render modes across the 139 active vectors                            |
| `roundtrip.spec.ts`       | Structural round-trip identity and asserted loss over the corpus           |
| `property.spec.ts`        | The same laws over generated Markings                                      |
| `parse.spec.ts`           | Complete-string syntax, errors, and Canonical/Presentation Order           |
| `validate.spec.ts`        | Membership, exclusion, cross-field, deprecation, and dependent-value rules |
| `validate-corpus.spec.ts` | Expected validation findings in the rendering corpus                       |
| `valid-portions.spec.ts`  | 111 independently sourced Portion Marks expected to remain clean           |
| `artifacts.spec.ts`       | Built ESM, CommonJS, global bundle, and descriptions subpath               |

`lossy.ts` owns the constructs a marking string cannot carry back. Both round-trip suites
assert those losses. Do not skip a failing round trip: either fix the codec or add a
specific, justified loss case. If an existing loss begins round-tripping, remove it.

`artifacts.spec.ts` can only exercise published files after `bun run build`.
`check:full` builds first so those assertions cannot be skipped at the release gate.

Coverage thresholds are 90% for statements, branches, functions, and lines. Generated
data is excluded because executing declarations is not meaningful logic coverage.

## Adding or changing a validation rule

Rule identity and wording always come from the vendored Schematron. Do not invent an
ISM-ID or copy its message into handwritten runtime code.

1. Determine whether every input to the rule exists on `Marking`. A rule requiring XML
   structure, Notices, Need-To-Know, Rollup, or authority-block fields does not belong in
   Marking-level validation.
2. If the rule matches an existing harvested shape, update the harvester rather than
   adding runtime logic. `packages/core/scripts/rules.ts` emits the generated inventory.
3. If the rule is Marking-expressible but its XPath cannot be represented by a harvested
   table, generate its ID and wording into `HAND_WRITTEN_RULES`, implement only its logic
   in `packages/core/src/written-rules.ts`, and add it to the exhaustive dispatcher and
   tests.
4. Run code generation, inspect the generated diff, and test both a triggering and a
   permitted Marking.

The generated inventory and exhaustive written-rule tests ensure that an authority rule
cannot silently lose its implementation.

## Documentation changes

Update public documentation with behavior changes:

- README for consumer-visible API, scope, or safety boundaries;
- `CONTEXT.md` for domain terminology only;
- `ARCHITECTURE.md` for current system structure and dependency direction;
- `docs/risks.md` for a known consumer hazard or evidence gap;
- `docs/roadmap.md` for direction that is not yet shipped;
- an ADR only for a durable, surprising decision made through a real trade-off.

Keep source paths and numeric claims testable. Prefer linking to the owning document over
copying architectural rationale into several places.

## Before handing off

- Run `bun run check:full`.
- Review generated and fixture diffs rather than accepting them mechanically.
- Confirm new public behavior is documented and covered by a focused test.
- Confirm unsupported authority scope remains explicit rather than silently skipped.
