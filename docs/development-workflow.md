# Development Workflow

This repo uses pnpm workspaces and TypeScript project references. All feature
work goes through pull requests.

## Local Setup

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
```

Use the Node.js version from `package.json`.

## Gate Checks

Run these before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

The CI gate runs the same checks. Coverage and bundle-size reporting can be
added as non-blocking info checks later.

## Commit Rules

- Keep each commit to one purpose: workspace, TypeScript, linting, CI, docs, API, UI, or tests.
- Do not mix implementation, tests, and unrelated refactors in the same commit.
- Do not commit secrets. Use GitHub or hosting-provider environments.
- If a gate check fails, fix it before adding the next layer.

## Day 1 Baseline

The first development PR establishes only the monorepo foundation:

```text
apps/
  api/
  web/
ingest/
packages/
  content/
  llm/
  shared/
```

Each workspace starts as a minimal package with a TypeScript project reference.
Feature code lands in later PRs.
