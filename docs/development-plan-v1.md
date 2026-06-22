# Development Plan v1 — 每日最小 Commit 穩定推進

**建立日期**：2026-06-22
**狀態**：定版，待島前輩拍板開工
**依據**：PRD v0.3、ADR-023、ADR-024

---

## 1. 團隊分工

| 角色 | 職責 |
|------|------|
| **宮城良田** | 主力開發：拆 task、寫 code、提 PR、修 bug |
| **三井壽** | PR Review：把關架構、安全、資料模型、CI、可維護性 |
| **流川楓** | 測試與除錯：跑 QA、開 issue、重現 bug、驗收修復 |

**協作節奏：**
- 宮城良田每日提 1–2 個 PR，每個 PR 內拆成最小 commit
- 三井壽收到 PR 後 review，重點盯架構風險
- 流川楓對已 merge 的功能執行測試，發現問題開 issue
- 發現架構風險時，先停在小 commit，交由三井壽 review，不繼續堆功能

---

## 2. 最小 Commit 規則

1. 每個 commit **只做一件事**：config / schema / API / test / docs 分開
2. 每個 commit 必須保持 `lint` / `typecheck` / `test` 不比前一個狀態差
3. 每個 PR 是一天的一個可驗收成果，不把多天範圍塞進同一 PR
4. 紅燈先修，不往下堆功能
5. Commit message 清楚描述行為變更

---

## 3. 技術棧（依據 ADR-024）

| Layer | Choice | Deploy |
|-------|--------|--------|
| Front end | Vite + React SPA + Tailwind | Cloudflare Pages |
| API | Hono | Cloudflare Workers |
| LLM | Vercel AI SDK (+ optional CF AI Gateway) | Workers |
| Auth | Auth0 + GitHub OAuth (JWT verify) | Workers |
| Heavy jobs | GitHub Actions (crawl, parse, OCR, ingest agent) | GitHub |
| Validation | Zod | — |
| Tests / Lint | Vitest + Biome | — |
| Package manager | pnpm (workspace) | — |

**Module 結構：**

```
apps/
  web/          Vite + React SPA
  api/          Hono Workers API
ingest/         GitHub Actions ingestion jobs
wiki/           LLM-authored canonical Markdown
raw/            original crawled/uploaded materials
packages/
  llm/          LLMProvider abstraction (Vercel AI SDK)
  content/      frontmatter schemas + Zod + lint rules
  shared/       shared types and utilities
```

---

## 4. 四週推進計畫

### Week 1：骨架 / CI / Auth / Schema / 薄前端 Shell

| PR | 目標 | Commit 拆法 | 三井壽 Review 重點 | 流川楓測試 |
|----|------|-------------|-------------------|-----------|
| PR 1 | Monorepo 基礎結構 | `chore: init pnpm workspace` → `chore: add shared ts config` → `chore: add biome config` → `ci: add gate checks` → `docs: dev workflow` | packages 切法是否支撐未來擴展；tsconfig project references | `pnpm lint` / `typecheck` 本地 + CI 通過 |
| PR 2 | Hono API 骨架 + `/health` | `feat: scaffold apps/api` → `feat: add hono health endpoint` → `feat: add middleware chain structure` | middleware chain 設計是否預留 auth/logging/error 擴展 | 本地 `curl /health` 回傳 200 |
| PR 3 | Auth0 JWT Middleware | `feat: add jwt verification middleware` → `test: add auth middleware tests` | Stateless 驗證、JWKS cache、token rotation 考量 | 無 JWT → 401；錯誤 JWT → 401；正確 JWT → 200 |
| PR 4 | Content Schema + `wiki/` 結構 | `feat: add packages/content zod schemas` → `feat: add wiki dir structure + sample md` → `feat: add AGENTS.md v1 frontmatter validation` | Schema 是否涵蓋 `siblings`、`source_refs`、`human_owned_sections` | 格式不合規的 md 在 CI 被 Zod 報錯 |
| PR 5 | 薄 React SPA Shell | `feat: scaffold apps/web vite+react` → `feat: add routing + layout` → `feat: add health status display` | 只有 routing + layout，不提前耦合 API contract；CORS 設定 | 頁面載入正常、可顯示 API health 狀態 |

### Week 2：Ingest / Upload / Source Tracking / Lint / LLM Wrapper

| PR | 目標 | 三井壽 Review 重點 | 流川楓測試 |
|----|------|-------------------|-----------|
| PR 6 | Ingest 腳本骨架 + wiki 寫入 utility | raw → wiki 的 traceability；`source_refs` 填值 | 寫入 utility 正確更新 `wiki/index.md` + `wiki/log.md` |
| PR 7 | URL 抓取 (fetch + Cheerio) 存入 `raw/` | 錯誤處理、timeout、`.meta.json` 格式 | 爬取特定網址，檢驗 `raw/` 生成正確；壞 URL 例外處理 |
| PR 8 | 手動上傳文件 (PDF/DOCX) 解析 | 檔案大小限制、Worker 外是否跑在 Actions | 上傳 PDF，測試字元解析完整度與空檔攔截 |
| PR 9 | `packages/llm` — LLMProvider 抽象層 | Provider interface 設計、model config 分離、AI Gateway 整合點 | API 能正確呼叫 OpenAI，設定 timeout |
| PR 10 | LLM 二創改寫 (rewrite) 流程 | `human_owned_sections` 保護機制；rewrite vs copy 判定 | 改寫確實非複製貼上；protected sections 未被覆寫 |
| PR 11 | CI Lint 腳本 (紅線、雙語對稱、免責聲明) | 規則覆蓋率；false positive 控制 | 故意寫入 rumors / 未發表產品 md，驗證 lint 報警 |

### Week 3：三大 Generator / Disclaimer

| PR | 目標 | 三井壽 Review 重點 | 流川楓測試 |
|----|------|-------------------|-----------|
| PR 12 | `POST /api/generate` 分流 + 共用 middleware | API contract 設計；rate limit 考量 | API 正確接受調用並轉發至 LLM |
| PR 13 | 考題產生器 (Quiz) Prompt Builder | Prompt 結構、JSON 輸出 schema、claim 出處 | 輸出為 JSON，含題目 + 正確答案 + 出處 |
| PR 14 | 影片腳本產生器 (Video Script) Prompt Builder | Pass 1 / Pass 2 分離邏輯 | 腳本區分事實大綱 vs 逐字稿分鏡 |
| PR 15 | 銷售展示腳本產生器 (Sales Script) Prompt Builder | FAB+P 邏輯嵌入；長度控制 | 1 分鐘 / 3 分鐘 / 10 分鐘生成長度正確 |
| PR 16 | 免責聲明 (`wiki/DISCLAIMER.md`) 動態注入 | 單一來源、雙語版本管理 | 所有產生器輸出頂部有正確雙語免責聲明 |

### Week 4：前端串接 / 部署 / Regression

| PR | 目標 | 三井壽 Review 重點 | 流川楓測試 |
|----|------|-------------------|-----------|
| PR 17 | 前端 Wiki 瀏覽頁面 | 資料載入策略；雙語切換 | 頁面載入速度、dark mode、RWD |
| PR 18 | 前端串接三大 Generator UI | Error handling；loading state | 手動操作三個 generator，參數正確發送、結果正確渲染 |
| PR 19 | 一鍵複製 + TXT/MD 下載 | 檔頭免責聲明完整性 | 複製 + 下載格式正確，免責聲明無缺漏 |
| PR 20 | Cloudflare 部署設定 (Pages + Workers) | Environment secrets 管理；preview vs production | Preview 部署能正常讀取環境變數 |
| PR 21 | Regression test + 修 P0/P1 | — | 依驗收清單全面測試，blocker/bug issue 關閉 |

---

## 5. CI 策略

分兩層：

| 層級 | 包含 | 行為 |
|------|------|------|
| **Gate**（必須通過才能 merge） | lint + typecheck + unit test | 紅燈擋 PR |
| **Info**（跑但不 block） | coverage report + bundle size | 提供資訊，不卡開發速度 |

---

## 6. 架構風險備忘（三井壽 Review checklist）

- [ ] Monorepo packages 切法：`packages/content`、`packages/llm`、`packages/shared`、`apps/api`、`apps/web`、`ingest/`
- [ ] PR 2 Hono 骨架預留 middleware chain（auth / logging / error handler）
- [ ] Week 1 Content schema 預留 `source_refs: string[]` 欄位
- [ ] `human_owned_sections` 在 LLM rewrite 時受保護
- [ ] CI Gate vs Info 分層從 Day 1 就建立
- [ ] Auth middleware stateless、JWKS 有 cache
- [ ] Workers runtime 限制：heavy work 在 GitHub Actions，不在 API

---

## 7. 開工前置條件

- [x] 部署目標確認：**Cloudflare**（Pages + Workers）
- [ ] GitHub Token（repo / PR / CI 操作）— 已確認有
- [ ] OpenAI API Key（Week 2 之後 LLM 功能用）
- [ ] Auth0 tenant 設定（Week 1 PR 3 需要）
- [ ] Cloudflare account / API token（Week 4 部署用）
