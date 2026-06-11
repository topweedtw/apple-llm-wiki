# Apple LLM Wiki

本專案是一個以 Apple 產品知識為核心、source-grounded 且適合 LLM 使用的知識庫。
每個可回答的主張都是有 evidence 支持的 source-backed fact，讓 LLM 回答能引用精確
來源，而不是依賴未經驗證的 prose。

English: [README.md](README.md)

## 現況

Phase 0（專案骨架）已完成。程式碼以「一次做好一條正確的垂直切片」的方式推進，從
Apple 規格頁 URL 一路到帶引用的答案。完整階段規劃見
[Implementation Plan](docs/implementation-plan.md)。

## 技術棧

選型見 [ADR-017](docs/adr/0017-runtime-and-framework-selection.md)：

- Runtime：TypeScript on Node.js 26.x
- 套件管理：pnpm
- Web API：Fastify
- CLI：Commander
- 驗證：Zod
- 資料庫：Postgres 17，以 Kysely + `pg` 存取
- Migration：checked-in SQL，由輕量 TypeScript runner 執行
- 測試：Vitest
- Lint/format：Biome
- HTML 解析（Phase 2 起）：Cheerio，必要時 fallback 到 Playwright

## 快速開始

前置需求：Node.js 26.x、pnpm，以及 Docker（本機 Postgres 用）。

```bash
pnpm install            # 安裝相依套件
cp .env.example .env    # 本機設定
pnpm db:up              # 在 Docker 啟動 Postgres 17
pnpm db:migrate         # 套用 SQL migrations
pnpm test               # 執行測試
```

常用指令：

| 指令 | 用途 |
| --- | --- |
| `pnpm dev` | 啟動 Fastify API 並 reload（`GET /health`） |
| `pnpm cli ping` | 執行 Commander CLI 進入點 |
| `pnpm typecheck` | TypeScript 型別檢查 |
| `pnpm lint` | Biome lint 與格式檢查 |
| `pnpm test` | 執行一次 Vitest |
| `pnpm db:migrate` | 套用待處理的 SQL migrations |

## 專案結構

```text
src/
  api/         Fastify routes 與 HTTP schemas
  cli/         Commander command 進入點
  config/      環境變數載入與驗證
  db/          Kysely client、migration runner、SQL migrations
  domain/      IDs、enums、errors 與 state-machine types
  ingestion/   source fetch、snapshot、parse、candidate writers（Phase 2）
  review/      review decisions 與 promotion rules（Phase 3）
  retrieval/   entity match、fact lookup、answer context（Phase 4）
  indexing/    outbox processing、projections、rebuilds（Phase 6）
test/          Vitest 測試與 fixtures
docs/          ADR、architecture flow 與 implementation plan
```

## 架構與實作

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

## ADR 集合

未來新增的 ADR 應該延續相同的雙語結構。
