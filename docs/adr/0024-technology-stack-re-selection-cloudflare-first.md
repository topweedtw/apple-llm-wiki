# ADR-024: Technology Stack Re-Selection (Cloudflare-First)

## Status

Accepted

## Date

2026-06-12

## Context

ADR-017 selected a backend-service stack (Fastify, Kysely, `pg`, Postgres,
Commander CLI, SQL migrations) to serve the Postgres structured fact layer.
ADR-023 re-anchors the architecture to a Markdown LLM-Wiki and pauses that fact
layer, so the runtime and framework selection must be redecided.

The product owner has chosen:

- deploy on **Cloudflare** first
- keep **LLM provider switchable**
- authentication via **Auth0 + GitHub OAuth**
- a **standalone API** separate from the front end
- a **single private GitHub repository** for now
- a **Vite + React SPA** front end (no SEO requirement)

## Decision

Adopt a Cloudflare-first TypeScript stack. The front end is a Vite + React SPA,
the standalone API runs on Cloudflare Workers using Hono, the LLM layer uses the
Vercel AI SDK behind a provider abstraction, and all heavy ingestion work runs
in GitHub Actions. This ADR supersedes ADR-017.

### Why Hono instead of Fastify

Cloudflare Workers run on a V8 isolate (workerd), not full Node.js, with CPU
time and Node-API limits. Fastify is designed for a Node HTTP server and does
not fit Workers. Hono is built for Workers/edge, is TypeScript-native and
lightweight, has a Fastify/Express-like API, and is portable (the same code can
run on Node, Bun, or Vercel), so the project is not locked into Cloudflare.

### Heavy work runs in GitHub Actions, not Workers

Crawling, PDF/DOCX/PPTX parsing, OCR, and Playwright cannot run on Workers
(missing Node binaries, CPU/time limits). These run in GitHub Actions on a full
Node environment, on a schedule, and open pull requests via Octokit. Cloudflare
hosts only the front end and the real-time API (generators, extraction, LLM
calls).

### LLM provider abstraction

Define an `LLMProvider` interface implemented with the **Vercel AI SDK**
(`ai` + `@ai-sdk/*`), which is runtime-agnostic and runs on Workers. Model
names live in configuration so ingestion can use a cheaper model and generators
a stronger one, switchable at any time. Optionally route requests through the
**Cloudflare AI Gateway** (set the SDK base URL to the gateway) to add caching,
rate limiting, and usage observability, supporting the < USD $200/month budget.

## Stack

| Layer | Choice | Deploy target |
| --- | --- | --- |
| Language | TypeScript on Node.js | — |
| Front end | Vite + React SPA + Tailwind | Cloudflare Pages |
| Standalone API | Hono | Cloudflare Workers |
| LLM | Vercel AI SDK (+ optional Cloudflare AI Gateway) | Workers |
| Auth | Auth0 + GitHub OAuth (Workers verify JWT) | — |
| Scheduling / heavy jobs | GitHub Actions (crawl, parse, OCR, Playwright, ingest agent, Octokit PRs) | GitHub |
| Fetch / parse | undici/`fetch` + Cheerio, Playwright fallback | GitHub Actions |
| Git operations | Octokit (agent opens PRs) | — |
| Markdown | gray-matter (frontmatter) + remark | — |
| Validation | Zod (frontmatter schema, API input, CI checks) | — |
| Tests / lint | Vitest + Biome | — |
| i18n | react-i18next | Front end |
| Storage | Single private GitHub repo (`wiki/`, `raw/`, config); Cloudflare R2 optional later for large files | — |
| Paused | Postgres, Kysely, `pg`, docker-compose, Commander CLI, Fastify, Next.js | — |

## Carried Over From Phase 0

These remain from the ADR-017 skeleton and are not re-learned:

- TypeScript on Node.js, pnpm, Vitest, Biome, Zod
- The ADR-010 layered fetch strategy (HTTP first, Playwright fallback, Cheerio
  parsing), moved into the GitHub Actions ingestion jobs

## Paused From Phase 0

- Fastify (replaced by Hono for Cloudflare), Kysely, `pg`, Postgres 17,
  docker-compose, Commander CLI, and SQL migrations are paused per ADR-023.
- The committed skeleton is kept in the repository as a reference and a possible
  future indexing backend, not deleted.

## Deployment Topology

```text
[Vite + React SPA] --HTTP--> [Hono API on Cloudflare Workers]
  Cloudflare Pages              generators, extraction, LLM calls, auth verify,
                                reads wiki content from Git
        |                              |
   Auth0 login                   Vercel AI SDK -> (Cloudflare AI Gateway) -> LLM
                                       |
[GitHub Actions] --scheduled crawl / ingest / parse / OCR-->
  LLM agent --Octokit--> pull request --> single private GitHub repo (wiki/, raw/)
```

## Module Structure (suggested)

```text
apps/
  web/        Vite + React SPA (browse, generators UI, upload)
  api/        Hono Workers API (generators, extraction, auth, wiki reads)
ingest/       GitHub Actions ingestion: crawl, parse, rewrite agent, PR
wiki/         LLM-authored canonical Markdown knowledge
raw/          original crawled/uploaded materials (LLM read-only)
packages/
  llm/        LLMProvider abstraction over Vercel AI SDK
  content/    frontmatter (gray-matter) + Zod schemas + lint rules
  shared/     shared types and utilities
AGENTS.md     wiki schema and rules (human-authored)
```

## Open Choices Deferred

- Exact Auth0 tenant/app configuration and the Workers JWT verification library.
- Whether large `raw/` files use Git LFS or Cloudflare R2 (decide when raw
  volume grows).
- OCR engine choice (Apple Vision via a local Action runner vs Tesseract in
  Actions).
- Whether the API later needs Cloudflare KV/D1 for caching or a query index when
  external extraction is opened.

## Consequences

Benefits:

- Stack matches Cloudflare deployment and the Markdown LLM-Wiki architecture.
- LLM provider stays switchable; AI Gateway adds cost control.
- Heavy, Node-only work is isolated in GitHub Actions where it belongs.
- TypeScript, pnpm, Vitest, Biome, and Zod carry over, so Phase 0 effort is not
  wasted.

Costs:

- Fastify is shelved in favor of Hono for the Cloudflare target.
- Next.js is not used; the SPA cannot do SSR/SEO (acceptable: no SEO need).
- Workers runtime limits require keeping heavy work out of the API.

## Follow-up Work

- Scaffold the `apps/web` SPA, `apps/api` Hono Worker, and `ingest/` Action.
- Implement the `LLMProvider` abstraction and a model configuration file.
- Add CI lint (markdown, frontmatter schema, red-line scan, bilingual symmetry,
  disclaimer presence) per PRD §8.3.
- Mark ADR-017 as superseded by this ADR.
