# Apple LLM Wiki

An LLM-native, source-grounded knowledge base focused on Apple products. Every
answerable claim is a source-backed fact with evidence, so LLM answers can cite
exact sources instead of relying on unverified prose.

Traditional Chinese: [README.zh-TW.md](README.zh-TW.md)

## Status

Phase 0 (project skeleton) is complete. The codebase is being built one correct
vertical slice at a time, from an Apple specification URL to a cited answer. See
the [Implementation Plan](docs/implementation-plan.md) for the full phase
roadmap.

## Tech Stack

Selected in [ADR-017](docs/adr/0017-runtime-and-framework-selection.md):

- Runtime: TypeScript on Node.js 26.x
- Package manager: pnpm
- Web API: Fastify
- CLI: Commander
- Validation: Zod
- Database: Postgres 17, accessed with Kysely + `pg`
- Migrations: checked-in SQL run by a thin TypeScript runner
- Tests: Vitest
- Lint/format: Biome
- HTML parsing (Phase 2+): Cheerio, with Playwright fallback

## Getting Started

Prerequisites: Node.js 26.x, pnpm, and Docker (for local Postgres).

```bash
pnpm install            # install dependencies
cp .env.example .env    # local configuration
pnpm db:up              # start Postgres 17 in Docker
pnpm db:migrate         # apply SQL migrations
pnpm test               # run the test suite
```

Common commands:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | run the Fastify API with reload (`GET /health`) |
| `pnpm cli ping` | run the Commander CLI entrypoint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Biome lint and format check |
| `pnpm test` | run Vitest once |
| `pnpm db:migrate` | apply pending SQL migrations |

## Project Structure

```text
src/
  api/         Fastify routes and HTTP schemas
  cli/         Commander command entrypoints
  config/      environment loading and validation
  db/          Kysely client, migration runner, SQL migrations
  domain/      IDs, enums, errors, and state-machine types
  ingestion/   source fetch, snapshot, parse, candidate writers (Phase 2)
  review/      review decisions and promotion rules (Phase 3)
  retrieval/   entity match, fact lookup, answer context (Phase 4)
  indexing/    outbox processing, projections, rebuilds (Phase 6)
test/          Vitest tests and fixtures
docs/          ADRs, architecture flow, and implementation plan
```

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

## ADR Set

Future ADRs should continue the same bilingual structure.
