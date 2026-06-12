# Apple LLM Wiki

An LLM-native, source-grounded knowledge base focused on Apple products. Every
answerable claim is a source-backed fact with evidence, so LLM answers can cite
exact sources instead of relying on unverified prose.

Traditional Chinese: [README.zh-TW.md](README.zh-TW.md)

## Status

The architecture has been re-anchored to a **Markdown LLM-Wiki**
([ADR-023](docs/adr/0023-architecture-re-anchoring-markdown-llm-wiki.md)) with a
**Cloudflare-first** technology stack
([ADR-024](docs/adr/0024-technology-stack-re-selection-cloudflare-first.md)).

The product is an LLM-maintained Apple product knowledge base in Git, plus
extraction tools (question banks, video scripts, sales scripts) for trainers.
See `docs/apple-llm-wiki-PRD-v0.2.md` for product scope.

The earlier Postgres structured fact layer (ADR-001/017) and its committed
Phase 0 skeleton are **paused**, not deleted. They may return as an indexing
backend if a future external extraction API needs precise retrieval.

## Tech Stack

Selected in [ADR-024](docs/adr/0024-technology-stack-re-selection-cloudflare-first.md)
(Cloudflare-first):

- Language: TypeScript on Node.js
- Front end: Vite + React SPA + Tailwind, on Cloudflare Pages
- Standalone API: Hono, on Cloudflare Workers
- LLM: Vercel AI SDK (switchable provider) + optional Cloudflare AI Gateway
- Auth: Auth0 + GitHub OAuth
- Scheduling / heavy jobs: GitHub Actions (crawl, parse, OCR, ingest agent)
- Markdown: gray-matter + remark; Validation: Zod
- Tests/lint: Vitest + Biome; i18n: react-i18next
- Storage: single private GitHub repo (`wiki/`, `raw/`, config)

Carried over from Phase 0: TypeScript, pnpm, Vitest, Biome, Zod, and the
layered fetch strategy. Paused: Fastify, Kysely, `pg`, Postgres, docker-compose,
Commander CLI.

## Getting Started

The Cloudflare-first apps are not scaffolded yet. The commands below belong to
the **paused** Phase 0 skeleton and are kept for reference:

```bash
pnpm install            # install dependencies
pnpm test               # run the test suite
pnpm typecheck          # TypeScript type checking
pnpm lint               # Biome lint and format check
```

## Project Structure

Target structure (ADR-024):

```text
apps/
  web/        Vite + React SPA (browse, generators UI, upload)
  api/        Hono Workers API (generators, extraction, auth, wiki reads)
ingest/       GitHub Actions ingestion: crawl, parse, rewrite agent, PR
wiki/         LLM-authored canonical Markdown knowledge
raw/          original crawled/uploaded materials (LLM read-only)
packages/     llm provider abstraction, content schemas, shared utils
AGENTS.md     wiki schema and rules (human-authored)
docs/         ADRs, architecture flow, implementation plan, PRD
```

The current `src/` tree (api/cli/db/domain/ingestion/...) is the paused Phase 0
Postgres skeleton, retained for reference.

## Architecture and Implementation

- [Architecture Flow](docs/architecture-flow.md)
  - [繁體中文](docs/architecture-flow.zh-TW.md)
- [Implementation Plan](docs/implementation-plan.md)
  - [繁體中文](docs/implementation-plan.zh-TW.md)

- [ADR-001: LLM Wiki Apple Product Knowledge Base](docs/adr/0001-llm-wiki-apple-product-knowledge-base.md)
  - [繁體中文](docs/adr/0001-llm-wiki-apple-product-knowledge-base.zh-TW.md)
- [ADR-002: Apple Product Entity Schema](docs/adr/0002-apple-product-entity-schema.md)
  - [繁體中文](docs/adr/0002-apple-product-entity-schema.zh-TW.md)
- [ADR-003: Fact Model and Citation Format](docs/adr/0003-fact-model-and-citation-format.md)
  - [繁體中文](docs/adr/0003-fact-model-and-citation-format.zh-TW.md)
- [ADR-004: Source Trust Levels](docs/adr/0004-source-trust-levels.md)
  - [繁體中文](docs/adr/0004-source-trust-levels.zh-TW.md)
- [ADR-005: Hybrid Retrieval Strategy](docs/adr/0005-hybrid-retrieval-strategy.md)
  - [繁體中文](docs/adr/0005-hybrid-retrieval-strategy.zh-TW.md)
- [ADR-006: Freshness Policy](docs/adr/0006-freshness-policy.md)
  - [繁體中文](docs/adr/0006-freshness-policy.zh-TW.md)
- [ADR-007: LLM Answer Citation Rules](docs/adr/0007-llm-answer-citation-rules.md)
  - [繁體中文](docs/adr/0007-llm-answer-citation-rules.zh-TW.md)
- [ADR-008: Data Discovery and Ingestion Workflow](docs/adr/0008-data-discovery-and-ingestion-workflow.md)
  - [繁體中文](docs/adr/0008-data-discovery-and-ingestion-workflow.zh-TW.md)
- [ADR-009: Historical Product Ingestion Policy](docs/adr/0009-historical-product-ingestion-policy.md)
  - [繁體中文](docs/adr/0009-historical-product-ingestion-policy.zh-TW.md)
- [ADR-010: Data Crawling and Extraction Technology Selection](docs/adr/0010-data-crawling-and-extraction-technology-selection.md)
  - [繁體中文](docs/adr/0010-data-crawling-and-extraction-technology-selection.zh-TW.md)
- [ADR-011: Crawl Validation and Ingestion Quality Assurance](docs/adr/0011-crawl-validation-and-ingestion-quality-assurance.md)
  - [繁體中文](docs/adr/0011-crawl-validation-and-ingestion-quality-assurance.zh-TW.md)
- [ADR-012: Knowledge-to-Content Generation Policy](docs/adr/0012-knowledge-to-content-generation-policy.md)
  - [繁體中文](docs/adr/0012-knowledge-to-content-generation-policy.zh-TW.md)
- [ADR-013: Source of Truth and Derived Views](docs/adr/0013-source-of-truth-and-derived-views.md)
  - [繁體中文](docs/adr/0013-source-of-truth-and-derived-views.zh-TW.md)
- [ADR-014: Ingestion Promotion State Machine](docs/adr/0014-ingestion-promotion-state-machine.md)
  - [繁體中文](docs/adr/0014-ingestion-promotion-state-machine.zh-TW.md)
- [ADR-015: Index Consistency and Rebuild Policy](docs/adr/0015-index-consistency-and-rebuild-policy.md)
  - [繁體中文](docs/adr/0015-index-consistency-and-rebuild-policy.zh-TW.md)
- [ADR-016: Fact Value Normalization Policy](docs/adr/0016-fact-value-normalization-policy.md)
  - [繁體中文](docs/adr/0016-fact-value-normalization-policy.zh-TW.md)
- [ADR-017: Runtime and Framework Selection](docs/adr/0017-runtime-and-framework-selection.md)
  - [繁體中文](docs/adr/0017-runtime-and-framework-selection.zh-TW.md)
- [ADR-018: Entity Resolution Rules](docs/adr/0018-entity-resolution-rules.md)
  - [繁體中文](docs/adr/0018-entity-resolution-rules.zh-TW.md)
- [ADR-019: Review Interface and Operations](docs/adr/0019-review-interface-and-operations.md)
  - [繁體中文](docs/adr/0019-review-interface-and-operations.zh-TW.md)
- [ADR-020: Unit Registry and Normalization](docs/adr/0020-unit-registry-and-normalization.md)
  - [繁體中文](docs/adr/0020-unit-registry-and-normalization.zh-TW.md)
- [ADR-021: Predicate Role and Entity Type Constraints](docs/adr/0021-predicate-role-and-entity-type-constraints.md)
  - [繁體中文](docs/adr/0021-predicate-role-and-entity-type-constraints.zh-TW.md)
- [ADR-022: Entity Seeding and Creation Policy](docs/adr/0022-entity-seeding-and-creation-policy.md)
  - [繁體中文](docs/adr/0022-entity-seeding-and-creation-policy.zh-TW.md)
- [ADR-023: Architecture Re-Anchoring to a Markdown LLM-Wiki](docs/adr/0023-architecture-re-anchoring-markdown-llm-wiki.md)
  - [繁體中文](docs/adr/0023-architecture-re-anchoring-markdown-llm-wiki.zh-TW.md)
- [ADR-024: Technology Stack Re-Selection (Cloudflare-First)](docs/adr/0024-technology-stack-re-selection-cloudflare-first.md)
  - [繁體中文](docs/adr/0024-technology-stack-re-selection-cloudflare-first.zh-TW.md)

## ADR Set

Future ADRs should continue the same bilingual structure.
