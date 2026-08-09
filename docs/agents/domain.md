# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — this repo is multi-context. The map points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`CONTEXT.md`** at the repo root — the shared context. Every package inherits it, so read it first.
- **`docs/adr/`** — system-wide decisions. Read the ADRs that touch the area you're about to work in. Also check `packages/<pkg>/docs/adr/` for package-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This repo is multi-context, signalled by `CONTEXT-MAP.md` at the root. Contexts are packages, not `src/` subdirectories:

```sh
/
├── CONTEXT-MAP.md                      ← entry point
├── CONTEXT.md                          ← shared context: the ISM codec domain
├── docs/adr/                           ← system-wide decisions (0001–0005)
└── packages/
    └── core/
        ├── CONTEXT.md                  ← per-package context (create as needed)
        └── docs/adr/                   ← package-scoped decisions (create as needed)
```

Only the shared `CONTEXT.md` and `docs/adr/` exist today. Add a per-package `CONTEXT.md` only when that package needs vocabulary the shared context does not already define; a per-package glossary may add terms but must not redefine a shared one.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
