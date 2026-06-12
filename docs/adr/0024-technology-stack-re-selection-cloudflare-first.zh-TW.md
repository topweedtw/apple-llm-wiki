# ADR-024：技術棧再選型（Cloudflare-First）

## 狀態

Accepted

## 日期

2026-06-12

## 背景

ADR-017 選了一套後端服務型技術棧(Fastify、Kysely、`pg`、Postgres、Commander
CLI、SQL migrations)來服務 Postgres 結構化 fact 層。ADR-023 將架構再定錨為
Markdown LLM-Wiki 並擱置該 fact 層,因此 runtime 與 framework 選型必須重新決定。

產品擁有者已選擇:

- 先部署在 **Cloudflare**
- LLM provider **保有可切換彈性**
- 認證採 **Auth0 + GitHub OAuth**
- 與前端分離的**獨立 API**
- 現階段單一**私有 GitHub repo**
- 前端採 **Vite + React SPA**(無 SEO 需求)

## 決策

採用 Cloudflare-first 的 TypeScript 技術棧。前端為 Vite + React SPA,獨立 API
以 Hono 跑在 Cloudflare Workers,LLM 層用 Vercel AI SDK 並置於 provider 抽象之
後,所有 ingestion 重活跑在 GitHub Actions。本 ADR 取代 ADR-017。

### 為何用 Hono 而非 Fastify

Cloudflare Workers 跑在 V8 isolate(workerd),不是完整 Node.js,有 CPU 時間與
Node API 限制。Fastify 是為 Node HTTP server 設計,不適合 Workers。Hono 專為
Workers/edge 而生、TypeScript 原生、輕量、API 寫法類似 Fastify/Express,且可攜
(同一份程式可跑在 Node、Bun、Vercel),不把專案綁死在 Cloudflare。

### 重活跑在 GitHub Actions,而非 Workers

爬蟲、PDF/DOCX/PPTX 解析、OCR、Playwright 無法在 Workers 跑(缺 Node binary、
有 CPU/時間限制)。這些跑在 GitHub Actions 的完整 Node 環境、依排程執行,並透過
Octokit 開 pull request。Cloudflare 只承載前端與即時 API(產生器、提取、LLM
呼叫)。

### LLM provider 抽象

定義一個 `LLMProvider` 介面,以 **Vercel AI SDK**(`ai` + `@ai-sdk/*`)實作;它
runtime-agnostic,可跑在 Workers。模型名稱寫在設定檔,讓 ingestion 用較便宜的
模型、產生器用較強的模型,可隨時切換。可選擇將請求路由經 **Cloudflare AI
Gateway**(把 SDK base URL 指向 gateway),加上快取、限流與用量觀測,支撐每月
< USD $200 的預算。

## 技術棧

| 層 | 選用 | 部署目標 |
| --- | --- | --- |
| 語言 | TypeScript on Node.js | — |
| 前端 | Vite + React SPA + Tailwind | Cloudflare Pages |
| 獨立 API | Hono | Cloudflare Workers |
| LLM | Vercel AI SDK(+ 可選 Cloudflare AI Gateway) | Workers |
| 認證 | Auth0 + GitHub OAuth(Workers 驗 JWT) | — |
| 排程/重活 | GitHub Actions(爬蟲、解析、OCR、Playwright、ingest agent、Octokit 開 PR) | GitHub |
| 抓取/解析 | undici/`fetch` + Cheerio,Playwright 後備 | GitHub Actions |
| Git 操作 | Octokit(agent 開 PR) | — |
| Markdown | gray-matter(frontmatter)+ remark | — |
| 驗證 | Zod(frontmatter schema、API 輸入、CI 檢查) | — |
| 測試/Lint | Vitest + Biome | — |
| i18n | react-i18next | 前端 |
| 儲存 | 單一私有 GitHub repo(`wiki/`、`raw/`、設定);大檔未來可選 Cloudflare R2 | — |
| 擱置 | Postgres、Kysely、`pg`、docker-compose、Commander CLI、Fastify、Next.js | — |

## 從 Phase 0 沿用

以下從 ADR-017 骨架保留,不需重學:

- TypeScript on Node.js、pnpm、Vitest、Biome、Zod
- ADR-010 的分層抓取策略(HTTP first、Playwright 後備、Cheerio 解析),移入
  GitHub Actions 的 ingestion jobs

## 從 Phase 0 擱置

- Fastify(Cloudflare 下由 Hono 取代)、Kysely、`pg`、Postgres 17、
  docker-compose、Commander CLI 與 SQL migrations 依 ADR-023 擱置。
- 已 commit 的骨架保留在 repo 作為參考與未來可能的索引後端,不刪除。

## 部署拓撲

```text
[Vite + React SPA] --HTTP--> [Cloudflare Workers 上的 Hono API]
  Cloudflare Pages              產生器、提取、LLM 呼叫、認證驗證、
                                從 Git 讀 wiki 內容
        |                              |
   Auth0 登入                    Vercel AI SDK -> (Cloudflare AI Gateway) -> LLM
                                       |
[GitHub Actions] --排程爬蟲 / ingest / 解析 / OCR-->
  LLM agent --Octokit--> pull request --> 單一私有 GitHub repo（wiki/、raw/）
```

## 模組結構(建議)

```text
apps/
  web/        Vite + React SPA（瀏覽、產生器 UI、上傳）
  api/        Hono Workers API（產生器、提取、認證、讀 wiki）
ingest/       GitHub Actions ingestion：爬蟲、解析、改寫 agent、開 PR
wiki/         LLM 撰寫的 canonical Markdown 知識
raw/          原始爬取/上傳素材（LLM 只讀）
packages/
  llm/        基於 Vercel AI SDK 的 LLMProvider 抽象
  content/    frontmatter（gray-matter）+ Zod schema + lint 規則
  shared/     共用型別與工具
AGENTS.md     wiki schema 與規則（人類撰寫）
```

## 延後的選擇

- Auth0 tenant/app 的確切設定,以及 Workers 驗 JWT 的函式庫。
- 大型 `raw/` 檔案用 Git LFS 還是 Cloudflare R2(待 raw 量成長時決定)。
- OCR 引擎(本地 Action runner 上的 Apple Vision vs Actions 內的 Tesseract)。
- API 未來是否需要 Cloudflare KV/D1 做快取,或在開放外部提取時加查詢索引。

## 影響

優點:

- 技術棧符合 Cloudflare 部署與 Markdown LLM-Wiki 架構。
- LLM provider 保持可切換;AI Gateway 增加成本控管。
- Node-only 的重活隔離在 GitHub Actions,各得其所。
- TypeScript、pnpm、Vitest、Biome、Zod 沿用,Phase 0 投入不浪費。

成本:

- 為了 Cloudflare 目標,Fastify 擱置改用 Hono。
- 不使用 Next.js;SPA 無法做 SSR/SEO(可接受:無 SEO 需求)。
- Workers runtime 限制要求把重活排除在 API 之外。

## 後續工作

- Scaffold `apps/web` SPA、`apps/api` Hono Worker 與 `ingest/` Action。
- 實作 `LLMProvider` 抽象與模型設定檔。
- 依 PRD §8.3 加 CI lint(markdown、frontmatter schema、紅線掃描、雙語對稱、
  disclaimer 存在性)。
- 將 ADR-017 標記為由本 ADR 取代。
