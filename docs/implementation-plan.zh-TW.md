# Implementation Plan (實作計畫) — 1個月收斂版

本計畫將原 18 週的時程壓縮至 **4 週**，並將每週任務拆解為**每日最小可提交 (PR) / 可測試單元**，以實現每次最小變更、穩定推進、快速收斂。本計畫於 2026-06-22 由宮城良田、三井壽與流川楓共同磨合定版，並經島前輩 (Weed Tan) 授權。

---

## 👥 角色分工

| 角色 | 負責 | 每日協作模式 |
| --- | --- | --- |
| <@1515632040312176700> 宮城良田 | **主力開發 (Code)** | 每日撰寫程式碼，拆分 Task，提交 **1-2 個小 PR**，修復 Bug。 |
| <@1485852397572984923> 三井壽 | **審查公關 (Review PR)** | 審查宮城良田的 PR，把關架構、Auth0/JWT 安全性、資料模型與 CI 設定，確保無架構硬傷。 |
| <@1490229719281434685> 流川楓 | **測試與除錯 (Test & Issue)** | 針對每日合併的 PR 執行手動 QA/測試，發現問題直接開標記清晰的 Issue，驗收 Bug fix。 |
| Weed Tan (島前輩) | **決策與工具 (Scope & Tool)** | 拍板 Scope、需求優先級、提供 API Key 等必要工具。 |

---

## 📅 每日 PR 任務拆解 (4 週定版)

### Week 1：骨架 + Schema + Auth + 薄前端 Shell
*   **PR 1 (Day 1)**: 建立 Monorepo 基礎結構。
    *   *Commit 拆分*：
        1. `chore: initialize pnpm workspace`
        2. `chore: add typescript shared config`
        3. `chore: add biome lint and format config`
        4. `ci: add lint and typecheck workflow`
        5. `docs: add development workflow`
    *   *流川楓測試*：驗證本機 `pnpm run lint` / `typecheck` 正常，CI lint 暢通。
*   **PR 2 (Day 2)**: 建立 API 基礎骨架（Hono Workers 基礎啟動、`/health` check endpoint，**並預留 middleware chain 結構**）。
    *   *流川楓測試*：發送請求至本地 Hono 服務，驗證回傳健康狀態與基礎 headers。
*   **PR 3 (Day 3)**: 導入 Auth0 JWT Middleware 驗證機制。
    *   *流川楓測試*：測試未帶/帶有錯誤 JWT 時 API 是否正確拒絕（401），帶有正確 JWT 時是否通過（200）。
*   **PR 4 (Day 4)**: 建立 `wiki/` 與 `raw/` 目錄結構，並加入首批示範 Markdown，驗證 `AGENTS.md` v1.0 schema 格式（預留 `source_refs: string[]` 欄位）。
    *   *流川楓測試*：手動檢驗雙語 frontmatter `siblings` 互相跳轉的正確性。
*   **PR 5 (Day 5)**: 建立極薄前端 React Shell (包含 routing、layout、CORS 配置與 health check API 呼叫，為後續串接鋪路)。
    *   *流川楓測試*：前後端聯調，驗證前端能成功與後端 API 通訊，解決跨網域與部署初期問題。

### Week 2：Ingest 管道 + 上傳 + Zod 驗證與 LLM 核心
*   **PR 6 (Day 6)**: 導入 `packages/content` 共享庫，實作 Zod Schema 對 frontmatter（使用 gray-matter）進行結構化驗證。
    *   *流川楓測試*：驗證格式不合規的 md 檔案在 CI 階段會被 Zod 報錯攔截。
*   **PR 7 (Day 7)**: 實作 Ingest 腳本骨架、手動 URL Ingest (fetch + Cheerio 解析) 與 raw/wiki 儲存。
    *   *流川楓測試*：測試爬取特定網址，檢驗 `raw/` 是否生成正確的原始檔與 `.meta.json`，對壞網址/空網址進行例外處理測試。
*   **PR 8 (Day 8)**: 實作手動上傳文件 (PDF/DOCX) 解析 API，將文字提煉並存入 `raw/`。
    *   *流川楓測試*：上傳真實 PDF 檔案，測試字元解析完整度與空檔攔截。
*   **PR 9 (Day 9)**: 建立 `packages/llm` 抽象層，包裝 OpenAI API / Vercel AI SDK 核心邏輯。
    *   *流川楓測試*：驗證 API 能正確接受調用並轉發至 OpenAI，設定 OpenAI 請求 Timeout（目標 <60s）。
*   **PR 10 (Day 10)**: 整合 LLM 二創改寫 (LLM rewrite) 核心邏輯，完成手動 Ingest 改寫流程。
    *   *流川楓測試*：測試二創改寫邏輯是否確實改寫原文（非複製貼上），確認 `human_owned_sections` 未被覆寫。

### Week 3：CI Lint + 三大素材產生器 + 免責聲明
*   **PR 11 (Day 11)**: 實作本地 CI Lint 檢查腳本（紅線關鍵字過濾、雙語對稱性檢查、來源追蹤）。
    *   *流川楓測試*：故意寫入包含 rumors 或未發表產品的 Markdown，驗證 Lint 腳本會報警攔截。
*   **PR 12 (Day 12)**: 建立 `POST /api/generate` 基礎分流與「考題產生器 (Quiz)」的 Prompt Builder。
    *   *流川楓測試*：驗證輸出是否為 JSON 格式，包含題目、正確答案與 claim 出處連結。
*   **PR 13 (Day 13)**: 實作「影片腳本產生器 (Video Script)」的 Prompt Builder。
    *   *流川楓測試*：驗證腳本是否區分 Pass 1 (事實大綱) 與 Pass 2 (逐字稿與分鏡)。
*   **PR 14 (Day 14)**: 實作「銷售展示腳本產生器 (Sales Script)」的 Prompt Builder。
    *   *流川楓測試*：驗證 FAB+P 銷售邏輯是否嵌入，測試 1 分鐘/3 分鐘/10 分鐘的生成長度控制。
*   **PR 15 (Day 15)**: 實作全域免責聲明 (`wiki/DISCLAIMER.md`) 動態讀取與注入機制。
    *   *流川楓測試*：驗證所有產生器的輸出內容頂部皆有正確雙語免責聲明。

### Week 4：前端串接、修 Bug 與部署
*   **PR 16 (Day 16)**: 前端串接三大產生器 API (Quiz/Video/Sales) UI。
    *   *流川楓測試*：手動操作產生器流程，確認參數正確發送至 Hono，結果正確渲染。
*   **PR 17 (Day 17)**: 實作產出結果一鍵複製與 TXT/MD 下載功能。
    *   *流川楓測試*：測試複製與下載格式，確認檔頭免責聲明無缺漏。
*   **PR 18 (Day 18)**: Vercel 全包部署設定與 GitHub Environments 變數配置。
    *   *流川楓測試*：驗證 Preview 部署網址是否能正常讀取環境變數。
*   **PR 19 (Day 19)**: regression test，全面手動 E2E 測試與除錯。
    *   *流川楓測試*：檢測 edge case，確認無 blocker 與 bug 遺留。
*   **PR 20 (Day 20)**: 最終驗收，全面修復 P0/P1 Issue 並交付。
    *   *流川楓測試*：依照驗收清單進行全面測試，將所有 blocker/bug Issue 關閉。

---

## 📋 協作與 CI 規範

### CI 底線與分層
*   **Gate (必過)**：`lint`、`typecheck`、`unit test`、`build` (通過是合併的唯一標準)。
*   **Info (參考)**：`coverage`、`bundle size` 等，不阻擋 merge。
*   **先不做**：完整 E2E、coverage gate、視覺回歸、多環境 matrix、複雜自動 PR ingest。

### 開工設計標準 (早期避雷)
*   **目錄切法**：固定為 `packages/content`、`packages/llm`、`apps/api`、`apps/web`。
*   **Schema 設計**：Week 1 建立 Schema 時必須預留 `source_refs: string[]` 用於來源追蹤。
*   **API 骨架**：PR 2 的 Hono API 必須先預留 middleware chain 結構。

### Secrets 管理
*   Production secrets 必須走 **GitHub Environments**，明確區分 `preview` 與 `production`，嚴禁全部塞在 repo-level secrets。

### 提交 PR 規範
1. 每天開 1-2 個小 PR。
2. 每個 PR 說明：做了什麼、怎麼測、是否在 MVP Scope 內。
3. CI 通過是合併的唯一標準。
4. 發現架構風險時，先停在小 commit，交給三井壽 review，不繼續堆功能。

### 開立 Issue 規範
流川楓開立 Issue 時必須帶有以下 Label：
*   `blocker`：阻礙主流程，宮城必須當天解決。
*   `bug`：功能錯誤，需在該週修復。
*   `ux`：介面可用性問題，行有餘力時處理.
*   `later`：超出 MVP scope，三井與島前輩拍板移至第二階段。
