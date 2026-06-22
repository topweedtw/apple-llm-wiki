# Apple LLM Wiki

本專案是一個以 Apple 產品知識為核心、source-grounded 且適合 LLM 使用的知識庫。
每個可回答的主張都是有 evidence 支持的 source-backed fact，讓 LLM 回答能引用精確
來源，而不是依賴未經驗證的 prose。

English: [README.md](README.md)

## 現況

架構已**再定錨為 Markdown LLM-Wiki**
（[ADR-023](docs/adr/0023-architecture-re-anchoring-markdown-llm-wiki.zh-TW.md)），
並採 **Cloudflare-first** 技術棧
（[ADR-024](docs/adr/0024-technology-stack-re-selection-cloudflare-first.zh-TW.md)）。

產品是一個由 LLM 維護、存於 Git 的 Apple 產品知識庫，加上給講師的提取工具
（考題、影片腳本、銷售腳本）。產品範圍見 `docs/apple-llm-wiki-PRD-v0.3.md`。

先前的 Postgres 結構化 fact 層（ADR-001/017）與已 commit 的 Phase 0 骨架
**擱置**而非刪除；若未來外部提取 API 需要精確檢索，可能復活當索引後端。

## 技術棧

選型見 [ADR-024](docs/adr/0024-technology-stack-re-selection-cloudflare-first.zh-TW.md)
（Cloudflare-first）：

- 語言：TypeScript on Node.js
- 前端：Vite + React SPA + Tailwind，部署 Cloudflare Pages
- 獨立 API：Hono，部署 Cloudflare Workers
- LLM：Vercel AI SDK（provider 可切換）+ 可選 Cloudflare AI Gateway
- 認證：Auth0 + GitHub OAuth
- 排程/重活：GitHub Actions（爬蟲、解析、OCR、ingest agent）
- Markdown：gray-matter + remark；驗證：Zod
- 測試/Lint：Vitest + Biome；i18n：react-i18next
- 儲存：單一私有 GitHub repo（`wiki/`、`raw/`、設定）

從 Phase 0 沿用：TypeScript、pnpm、Vitest、Biome、Zod 與分層抓取策略。
擱置：Fastify、Kysely、`pg`、Postgres、docker-compose、Commander CLI。

## 快速開始

Cloudflare-first 的 app 尚未 scaffold。以下指令屬於**擱置中**的 Phase 0 骨架，
保留作參考：

```bash
pnpm install            # 安裝相依套件
pnpm test               # 執行測試
pnpm typecheck          # TypeScript 型別檢查
pnpm lint               # Biome lint 與格式檢查
```

## 專案結構

目標結構（ADR-024）：

```text
apps/
  web/        Vite + React SPA（瀏覽、產生器 UI、上傳）
  api/        Hono Workers API（產生器、提取、認證、讀 wiki）
ingest/       GitHub Actions ingestion：爬蟲、解析、改寫 agent、開 PR
wiki/         LLM 撰寫的 canonical Markdown 知識
raw/          原始爬取/上傳素材（LLM 只讀）
packages/     llm provider 抽象、content schema、共用工具
AGENTS.md     wiki schema 與規則（人類撰寫）
docs/         ADR、architecture flow、implementation plan、PRD
```

目前的 `src/`（api/cli/db/domain/ingestion/…）是擱置中的 Phase 0 Postgres
骨架，保留作參考。

## 架構與實作

- [Architecture Flow](docs/architecture-flow.md)
  - [繁體中文](docs/architecture-flow.zh-TW.md)
- [Current Development Plan](docs/current-development-plan.md)
  - [繁體中文](docs/current-development-plan.zh-TW.md)
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

## ADR 集合

未來新增的 ADR 應該延續相同的雙語結構。
