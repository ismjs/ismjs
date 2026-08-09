# Context Map

This repo is multi-context. Read the contexts relevant to your topic.

| Context       | Glossary                   | ADRs                      | Covers                                                                                                                                                                        |
| ------------- | -------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared        | `CONTEXT.md`               | `docs/adr/`               | The ISM codec domain — Marking, Banner Line, Portion Mark, Canonical Order, Consumption, and the rest of the ubiquitous language. Read this first; every package inherits it. |
| `@ismjs/core` | `packages/core/CONTEXT.md` | `packages/core/docs/adr/` | Not yet created. Add one only when the package needs vocabulary the shared context does not already define.                                                                   |

Terms defined in the shared `CONTEXT.md` mean the same thing in every package.
A per-package `CONTEXT.md` may add terms, but must not redefine a shared one.
