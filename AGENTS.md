# AGENTS.md

Instructions for coding agents working in this repository.

## Commits and releases

Use Conventional Commit messages shaped for release-please. The commit that lands
on `main` determines the release: `fix:` triggers a patch, `feat:` triggers a
minor, and an exclamation mark such as `feat!:` or `fix!:` triggers a major.
Use other Conventional Commit types such as `docs:`, `test:`, `refactor:`, or
`chore:` for changes that should not trigger a Node package release. Scopes are
optional. Prefer squash-merging pull requests so the squash commit clearly states
the release impact.

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-role triage vocabulary is used. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points at the shared context and any
per-package contexts under `packages/*/`. See `docs/agents/domain.md`.
