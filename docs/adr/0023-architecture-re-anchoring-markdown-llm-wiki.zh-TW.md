# ADR-023：架構再定錨為 Markdown LLM-Wiki

## 狀態

Accepted

## 日期

2026-06-12

## 背景

ADR-001 到 ADR-022 設計的是一個以 Postgres 為基礎的結構化 fact 知識庫:atomic
source-backed facts、entity/predicate/value 模型、candidate intake 與 promotion
state machine,以及 cited-answer API。ADR-001 當初明確否決「Pure Markdown
Wiki」,理由是它對精確規格查詢、數值比較與 source 級引用較弱。

PRD v0.2(`docs/apple-llm-wiki-PRD-v0.2.md`)陳述了專案擁有者的真實產品需求:

- 由 LLM 維護的 Apple 產品知識庫
- 從知識庫提取教學素材(考題、影片腳本、銷售腳本)
- 未來將提取能力對外開放給其他講師
- 由一個多為非工程師的小團隊維護,透過 GitHub pull request 審核變更

這些需求改變了 ADR-001 當初否決的前提。本產品是給講師的「教材產出引擎」,不是
規格比價查詢引擎。Markdown wiki 的弱點(精確數值/規格查詢)不在本產品的關鍵路徑
上;而它的強項(LLM 讀寫、非工程師用 GitHub PR 審核、人類可讀頁面、社群貢獻)正是
本產品需要的。

## 決策

將架構**再定錨為 Markdown LLM-Wiki** 作為主要設計,遵循 PRD v0.2 的結構。
Postgres 結構化 fact 層**擱置而非刪除**,並將其累積的品質紀律保留為護欄。

### 主架構

- **單一私有 Git repo 內的兩個內容層**(現階段):
  - `raw/` — 原始爬取頁面與上傳素材(LLM 只讀)
  - `wiki/` — LLM 撰寫、改寫(「二創」)的 canonical 知識頁(LLM 寫)
- **`AGENTS.md`** — 人類撰寫、LLM 必須遵守的 schema 與規則
- **維護流程**:LLM agent 攝取來源並開 GitHub pull request;人類透過 GitHub web
  介面審核合併
- **單一事實來源(SSoT)**:Git 上的 Markdown 內容。`raw/` 是 evidence of
  record;`wiki/` 是 canonical 改寫知識。Postgres 不再是 SSoT。
- **提取層**:考題、影片腳本、銷售腳本產生器讀取 wiki,產出教學素材,並以 claim
  級可追溯連回 wiki 來源。

### Repo 範圍

先採**單一私有 repo**,內含 `wiki/`、`raw/`、設定、SPA 前端、API 與 ingestion
程式碼。PRD 的公開/私有雙 repo 拆分**延後**到真正要對外發布時再做。即使在私有
階段,LLM 仍應改寫(「二創」)來源內容而非複製原文,以保持未來拆公開時的乾淨。

### 技術

Runtime 與 framework 選型在 **ADR-024** 重新決定(Cloudflare-first:Vite +
React SPA、Workers 上的 Hono API、Vercel AI SDK、GitHub Actions 跑 ingestion)。
ADR-024 取代 ADR-017。

## 與既有 ADR 的關係

ADR 不逐份原地改寫。本 ADR 是每份 ADR 新狀態的單一紀錄。狀態定義:

- **Retained(保留)** — 仍適用,幾乎不改即可對映 wiki 模型
- **Re-scoped(重定位)** — 原則保留,但機制改為適用 Markdown/PR 世界
- **On-hold(擱置)** — 專屬 Postgres 結構化 fact 層;暫停,直到外部提取/索引層需要
- **Superseded(取代)** — 由本 ADR 或 ADR-024 取代

| ADR | 主題 | 新狀態 | 備註 |
| --- | --- | --- | --- |
| 001 | 知識庫架構 | Superseded | 由本 ADR 取代;fact-citation 原則保留為護欄 |
| 002 | Entity schema | On-hold | entity 概念改為 wiki 頁面組織與 frontmatter,不建 DB 表 |
| 003 | Fact model 與 citation | Re-scoped | claim 級可追溯改為 wiki footnote/`claim_refs`;結構化 fact 表擱置 |
| 004 | Source trust levels | Retained | 對映 PRD 來源分級 T1–T4 |
| 005 | Hybrid retrieval | On-hold | 若建外部提取/索引層再議 |
| 006 | Freshness policy | Retained | 對映 frontmatter `status` + 月度 lint |
| 007 | Answer citation rules | Re-scoped | 改為提取產生器的引用規則 |
| 008 | Discovery 與 ingestion workflow | Re-scoped | LLM agent ingest + PR,而非 DB candidate/promotion 流程 |
| 009 | Historical ingestion policy | Retained | 政策仍適用於 wiki 內容 |
| 010 | Crawl/extraction 技術 | Retained | 抓取策略保留;Postgres 儲存部分移除 |
| 011 | Crawl validation 與 QA | Re-scoped | 改為 CI lint + PR 審核 gate |
| 012 | Knowledge-to-content 生成 | Retained | 三個產生器的核心政策;高度適用 |
| 013 | Source of truth 與 derived views | Re-scoped | SSoT 重新定義為 Git Markdown |
| 014 | Ingestion promotion state machine | On-hold | 改為 PR 審核狀態;保留 `needs_review`/conflict 精神 |
| 015 | Index consistency 與 rebuild | On-hold | 尚無 DB/index;外部提取時再議 |
| 016 | Fact value normalization | On-hold | wiki 模型無結構化 value 層 |
| 017 | Runtime 與 framework | Superseded | 由 ADR-024 取代 |
| 018 | Entity resolution | On-hold | Postgres-fact-層機制 |
| 019 | Review interface 與 operations | Re-scoped | CLI 審核 → GitHub PR web 審核 |
| 020 | Unit registry | On-hold | Postgres-fact-層機制 |
| 021 | Predicate role registry | On-hold | Postgres-fact-層機制 |
| 022 | Entity seeding | On-hold | Postgres-fact-層機制 |

## 沿用的品質護欄

以下 ADR 紀律明確帶進 wiki 模型,讓再定錨不致失去得來不易的嚴謹:

- **來源信任(ADR-004)** 強化 PRD 的 T1–T4 分級規則。
- **Freshness(ADR-006)** 支撐 frontmatter `status` 與月度 lint。
- **Claim 級可追溯(ADR-003、ADR-012)** 表示 wiki footnote 是可驗證引用,而非
  只貼 URL;產生器必須追溯每一個事實主張。
- **Ingestion 審核精神(ADR-014)** 對映 PR 狀態:`needs_review`、`conflict`、
  `lang-sync`。
- **內容生成政策(ADR-012)** 幾乎可直接套用到三個產生器(FAB+P、`claim_refs`、
  review level)。

## Phase 0 骨架處置

已 commit 的 Phase 0 骨架(Postgres、Fastify、Kysely、Commander CLI、
docker-compose)**已從 `main` 移除**,並保存於 tag `v1-postgres-architecture`
與分支 `archive/postgres-fact-layer`。若未來外部提取 API 需要精確檢索,可從那裡
復活當索引/查詢後端。ADR-024 定義哪些沿用(TypeScript、pnpm、Vitest、Biome、
Zod)、哪些擱置。

## 影響

優點:

- 架構現在符合真實產品:LLM 維護、非工程師 PR 審核、教學素材提取。
- 既有 ADR 的嚴謹被保留為護欄,而非丟棄。
- 單一私有 repo 讓首次建置簡單;公開/私有拆分延後但不被阻擋。

成本:

- 大量結構化 fact 層設計被擱置。
- Phase 0 Postgres 骨架短期內不使用。
- 精確結構化查詢延後到未來的提取/索引層。

## 後續工作

- 在 ADR-024 記錄重新決定的技術棧。
- 在 ADR-001 與 ADR-017 頂部加狀態標記,指向本 ADR 與 ADR-024。
- 撰寫 `AGENTS.md` v1.0 作為 wiki schema(PRD 附錄 B)。
- ADR-023 與 ADR-024 接受後,規劃 wiki Phase 1(PRD §9)。
