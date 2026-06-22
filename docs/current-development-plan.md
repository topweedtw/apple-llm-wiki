# Current Development Plan

Last updated: 2026-06-22

This is the current execution plan confirmed by the team. The older
[`implementation-plan.md`](implementation-plan.md) describes the paused
Postgres structured fact-layer direction and is retained for history. This plan
follows [ADR-023](adr/0023-architecture-re-anchoring-markdown-llm-wiki.md),
[ADR-024](adr/0024-technology-stack-re-selection-cloudflare-first.md), and
[PRD v0.3](apple-llm-wiki-PRD-v0.3.md).

## 1. Team Roles

| Role | Responsibility |
| --- | --- |
| Miyagi Ryota | Primary developer. Breaks down tasks, writes code, opens PRs, fixes issues, and keeps commits minimal. |
| Mitsui Hisashi | PR reviewer. Guards architecture, security, data modeling, and CI. |
| Rukawa Kaede | Testing and debugging. Runs QA, isolates failures, opens issues, and verifies bug fixes. |

All functional changes go through pull requests. The developer does not merge
their own PRs; maintainers decide after review and testing.

## 2. Commit and PR Rules

- One commit changes one kind of thing: config, schema, API, UI, test, or docs.
- Every commit should keep the repo installable and typecheckable, and must not make the existing test state worse.
- Every PR is one reviewable daily outcome, not a bundle of cross-week scope.
- Fix red checks before stacking more functionality.
- Stop at a small commit when an architectural risk appears, then send it to review.

## 3. Target Repository Shape

The MVP moves toward this structure:

```text
apps/
  web/        Vite + React SPA
  api/        Hono Workers API
ingest/       GitHub Actions ingestion jobs
wiki/         canonical Markdown knowledge base
raw/          original crawled/uploaded materials
packages/
  content/    frontmatter schema, Markdown parsing, lint rules
  llm/        Vercel AI SDK provider abstraction
AGENTS.md     wiki schema and agent rules
docs/         PRD, ADRs, architecture, development plan
```

## 4. Four-Week PR Plan

### Week 1: Skeleton, CI, Auth Boundary, Schema, Thin SPA Shell

Goal: establish the foundation without committing application complexity too early.

| PR | Scope | Reviewer focus | Test focus |
| --- | --- | --- | --- |
| PR 1 | Initialize monorepo/workspace structure and package boundaries. | `packages/content`, `packages/llm`, `apps/api`, `apps/web` can evolve independently. | Install and basic scripts run locally. |
| PR 2 | Add shared TypeScript and Biome configuration. | Strict TS defaults and consistent formatter/lint rules. | `typecheck` and `lint` run cleanly. |
| PR 3 | Add CI gate checks. | Gate vs info checks are separated. | Failing lint/typecheck/test blocks PR. |
| PR 4 | Scaffold Hono API with `/health` and middleware chain. | Router shape supports Auth middleware without later rewrite. | Health endpoint returns expected status. |
| PR 5 | Add Auth0 JWT middleware boundary. | Stateless verification, JWKS cache strategy, failure behavior. | Missing/invalid token is rejected; valid token passes protected route. |
| PR 6 | Add `packages/content` frontmatter Zod schema. | Includes `siblings`, `source_refs`, `ingest_managed_sections`, `human_owned_sections`. | Invalid Markdown frontmatter fails validation. |
| PR 7 | Add thin React SPA shell. | Routing/layout/health check only; avoid coupling to unfinished APIs. | SPA loads, health state renders, responsive layout does not break. |

Day 1 minimal commit sequence:

```text
chore: initialize pnpm workspace
chore: add shared typescript config
chore: add biome lint and format config
ci: add gate checks workflow
docs: add development workflow
```

### Week 2: Ingest, Upload, Source Tracking, LLM Wrapper, Rewrite

Goal: make raw-to-wiki traceability and controlled rewrite possible.

| PR | Scope | Reviewer focus | Test focus |
| --- | --- | --- | --- |
| PR 8 | Add ingest script skeleton and wiki write utilities. | Write utilities keep append-only log behavior where required. | `wiki/index.md` and `wiki/log.md` update predictably. |
| PR 9 | Add URL fetch + parse flow into `raw/`. | Raw snapshots include metadata and do not overwrite without trace. | Good URL stores raw + metadata; bad URL fails cleanly. |
| PR 10 | Add upload parsing for PDF/DOCX into `raw/`. | File limits, empty file handling, parser boundaries. | Real fixture parses; empty/bad files are rejected. |
| PR 11 | Add `packages/llm` provider abstraction. | Business logic does not depend directly on one model/provider. | Mock provider supports deterministic tests and timeout behavior. |
| PR 12 | Add LLM rewrite flow from raw/source refs to wiki draft. | `source_refs` traceability and `human_owned_sections` protection. | Rewrite is not copy-paste; protected sections are preserved. |

### Week 3: CI Content Lint and Generators

Goal: make generated content useful while keeping red lines enforceable.

| PR | Scope | Reviewer focus | Test focus |
| --- | --- | --- | --- |
| PR 13 | Add CI content lint checks. | Markdown, frontmatter schema, red-line scan, bilingual symmetry, disclaimer presence. | Deliberately invalid fixtures fail CI. |
| PR 14 | Add `POST /api/generate` routing and API contracts. | Generator API is typed, bounded, and provider-agnostic. | Requests validate and time out predictably. |
| PR 15 | Add quiz generator prompt builder. | Output schema requires question, answer, explanation, claim sources. | JSON output validates and cites source refs. |
| PR 16 | Add video script generator prompt builder. | Separates fact outline from transcript/storyboard. | Pass 1 and Pass 2 structures validate. |
| PR 17 | Add sales script generator prompt builder. | FAB+P logic and 1/3/10 minute length controls. | Length mode and required sections validate. |
| PR 18 | Add `wiki/DISCLAIMER.md` read/inject mechanism. | Single source of disclaimer truth. | All generator outputs include bilingual disclaimer. |

### Week 4: Frontend Integration, Deployment, Regression

Goal: deliver an internally usable MVP and close blocker issues.

| PR | Scope | Reviewer focus | Test focus |
| --- | --- | --- | --- |
| PR 19 | Wire SPA to wiki browse and generator APIs. | UI stays decoupled from implementation details. | Main workflows work in desktop and mobile viewports. |
| PR 20 | Add copy and TXT/MD download for generated output. | Download output keeps disclaimer and source refs. | Copy/download content matches rendered result. |
| PR 21 | Add Cloudflare/Vercel deployment configuration as decided by maintainer. | Secrets are env-only and never committed. | Preview deploy reads env and health checks pass. |
| PR 22 | Regression pass and P0/P1 fixes. | No broad refactor during stabilization unless required. | All blocker issues are closed or explicitly deferred. |

## 5. CI Policy

Gate checks block merge:

- lint
- typecheck
- unit tests
- required content lint once added

Info checks run but do not block early development:

- coverage report
- bundle size report
- non-critical performance notes

## 6. Review Checklist

Mitsui reviews:

- monorepo package boundaries match the target structure
- Hono middleware chain supports Auth and later cross-cutting concerns
- frontmatter schema reserves `source_refs`
- CI is split into gate and info checks
- LLM rewrite never overwrites `human_owned_sections`
- secrets only come from GitHub/hosting provider environments

## 7. Test Checklist

Rukawa tests:

- local and CI lint/typecheck/test results match
- API health/Auth success and failure paths
- ingest behavior for good/bad URLs, empty files, and invalid files
- raw -> wiki `source_refs` traceability
- generator output JSON schema, disclaimer, and source refs
- frontend main workflows, copy, download, and responsive layout

## 8. Open Decisions

- Deployment target: maintainer decision. Current recommendation is Cloudflare-first per ADR-024; Vercel remains acceptable if maintainer prioritizes speed for the first preview.
- Production secrets: GitHub token and OpenAI key must be configured in GitHub/hosting environments, never committed.
