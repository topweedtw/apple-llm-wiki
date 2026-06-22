# Current Development Plan（最新版開發計畫）

Last updated: 2026-06-22

本文件是目前團隊確認的執行計畫。舊的
[`implementation-plan.zh-TW.md`](implementation-plan.zh-TW.md) 描述的是已擱置的
Postgres structured fact-layer 方向，保留作歷史參考；本文件以
[ADR-023](adr/0023-architecture-re-anchoring-markdown-llm-wiki.zh-TW.md)、
[ADR-024](adr/0024-technology-stack-re-selection-cloudflare-first.zh-TW.md) 與
[PRD v0.3](apple-llm-wiki-PRD-v0.3.md) 為準。

## 1. Team Roles

| 角色 | 職責 |
| --- | --- |
| 宮城良田 | 主力開發。拆 task、寫 code、提 PR、修 issue，負責維持最小 commit 粒度。 |
| 三井壽 | PR review。把關架構、安全、資料模型、CI，避免早期設計埋雷。 |
| 流川楓 | 測試與除錯。執行 QA、定位失敗、開 issue、驗收 bug fix。 |

所有功能變更都走 PR。開發者不自行 merge；review 與測試完成後由維護者決定是否合併。

## 2. Commit and PR Rules

- 每個 commit 只做一件事：config、schema、API、UI、test、docs 分開。
- 每個 commit 都應保持 repo 可安裝、可 typecheck，且不讓既有測試狀態變差。
- 每個 PR 是一天內可驗收的一個成果，不混入跨週 scope。
- 紅燈先修，不在失敗狀態上繼續堆功能。
- 架構風險先停在小 commit，交給三井壽 review 後再前進。

## 3. Target Repository Shape

MVP 期間固定朝下列結構推進：

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

三井壽 review 時優先看：

- monorepo package boundary 是否符合目標結構
- Hono middleware chain 是否支援 Auth 與後續 cross-cutting concerns
- frontmatter schema 是否預留 `source_refs`
- CI 是否分成 gate 與 info
- LLM rewrite 是否不覆寫 `human_owned_sections`
- Secrets 是否只透過 GitHub/hosting provider environment 設定

## 7. Test Checklist

流川楓測試時優先驗：

- 本機與 CI 的 lint/typecheck/test 狀態一致
- API health/Auth 的成功與失敗路徑
- ingest 對好/壞 URL、空檔、壞檔的處理
- raw -> wiki 的 `source_refs` traceability
- generator output JSON schema、disclaimer、source refs
- 前端主要流程、複製、下載、響應式排版

## 8. Open Decisions

- Deployment target: maintainer decision. Current recommendation is Cloudflare-first per ADR-024; Vercel remains acceptable if maintainer prioritizes speed for the first preview.
- Production secrets: GitHub token and OpenAI key must be configured in GitHub/hosting environments, never committed.
