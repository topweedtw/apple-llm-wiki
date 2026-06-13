# PRD — Apple 產品知識 LLM-Wiki 平台

**文件版本**：v0.3
**作者**：Willer（企業講師）；v0.3 架構/技術更新由開發團隊納入
**最後更新**：2026-06-13
**狀態**：開發中 — 架構與技術棧決議已納入（ADR-023 / ADR-024），以單一私有 repo 起步
**前一版**：v0.2（雙 repo + Next.js/Vercel 假設）

---

## 變更摘要 (v0.2 → v0.3)

v0.3 反映開發團隊評估後的架構與技術決議，正式記錄於 ADR-023（架構再定錨）與
ADR-024（技術棧再選型）。產品願景、內容範圍、紅線、功能需求與 Disclaimer 機制
維持不變。

| # | 主題 | v0.2 | v0.3 決議 | 依據 |
|---|---|---|---|---|
| A1 | Repo 架構 | 公開 wiki + 私有 raw 雙 repo | **單一私有 repo**；未來有需求再拆公開/私有 | ADR-023 |
| A2 | 前端 | Next.js | **Vite + React SPA**（無 SEO 需求） | ADR-024 |
| A3 | API | 隱含於 Next.js | **獨立 Hono API**（Cloudflare Workers） | ADR-024 |
| A4 | LLM | 綁定 Claude Sonnet/Opus | **Vercel AI SDK 可切換 provider** + 可選 Cloudflare AI Gateway | ADR-024 |
| A5 | 認證 | Auth0 / Clerk | **Auth0 + GitHub OAuth** | ADR-024 |
| A6 | 部署 | Vercel + GitHub | **Cloudflare（Pages + Workers）** + GitHub | ADR-024 |
| A7 | 開源 / License / 公開治理 | 公開即啟用 | **延後到對外階段**（私有期間不適用） | ADR-023 |
| A8 | wiki schema | 待撰寫 AGENTS.md | **AGENTS.md v1.0 已完成**（見 repo 根 `/AGENTS.md`） | ADR-023 |

> **架構級調整**：v0.2 為了公開託管的版權隔離採雙 repo。v0.3 先以**單一私有
> repo** 起步，版權暴露風險降低；但 LLM 仍維持「二創改寫、不複製原文」習慣，
> 為未來拆出公開 wiki 預留乾淨路徑（詳見 §3.1）。

---

## 1. 專案概述

### 1.1 背景與問題陳述

我（Willer）是專責 Apple 產品知識與門市銷售技巧的企業講師，授課對象為**經銷商內部講師**及**授權經銷商門市人員**。目前痛點：

- **教材分散**：手上有少量官方文字教材，但 Apple 產品線更新快（每年至少春秋兩次發表會 + WWDC + OS 重大版本），教材維護負擔重。
- **重複工作量大**：每次新品發表後，都需要手動重做考題、重寫銷售展示腳本、重錄教學短片，效率低。
- **內容一致性難維持**：不同場次的教學內容容易因為個人記憶而出現偏差，缺少「單一事實來源 (Single Source of Truth)」。
- **時效性挑戰**：如近期 WWDC 26 發布的 OS 27 Beta，需要即時納入教材，傳統作業流程跟不上。

### 1.2 願景

打造一個由**少量人類維護者 + LLM Agent** 共同維持的 Apple 產品知識庫，扮演我教學工作的「**智能教材中樞**」：

> 一次維護知識，多種輸出產製。
> 知識會**累積複利**，而不是每次查詢都重新生成。

v0.3 先以單一私有 repo 內部運作；待內容成熟且確認合規後，再評估拆出公開 wiki，
為亞太地區 Apple 經銷商培訓社群建立可協作的知識基礎設施。

### 1.3 目標 (Goals)

| # | 目標 | 衡量指標 |
|---|---|---|
| G1 | 建立 Apple 全產品線（iPhone / iPad / Mac / Watch / Vision / 服務 / OS）繁中+英文雙語結構化知識庫 | 涵蓋當前在售全產品 + 最新 OS 版本，雙語覆蓋率 ≥ 90% |
| G2 | 自動爬取公開官網內容，並支援手動上傳教材 | 每週自動更新 + 上傳 PDF/PPT/DOCX 後 < 5 分鐘可查詢 |
| G3 | 提供前端介面快速產出三類教學素材：考題、影片腳本、銷售展示稿 | 講師備課時間從 4 小時/場 → < 1 小時/場 |
| G4 | 在 2-3 人小團隊規模下可永續維護 | 月維護工時 < 8 小時/人 |
| G5 | （未來對外階段）建立可被 Apple 培訓圈引用的開源知識庫 | 拆出公開 repo 後：Stars > 50、外部 PR 貢獻者 > 5 |

### 1.4 非目標 (Non-Goals)

- ❌ 不做面向終端消費者的問答產品（這是給講師用的後台工具）
- ❌ 不複製 Apple 官網功能、不替代 Apple 官方訓練平台 (SEED / Sales Training)
- ❌ 不做即時影音生成（只產出腳本與分鏡建議，不產出影片本身）
- ❌ 不在未來的公開 repo 中存放任何具版權爭議的原始素材（見 §3.1）

---

## 2. 使用者與角色

### 2.1 角色 A：知識庫維護者（核心使用者）

| 屬性 | 說明 |
|---|---|
| 人數 | 3-4 人（我 + 2-3 名團隊成員） |
| 技術背景 | 一般使用者，**非工程師**；熟悉 Mac/iOS、會用 Markdown、能進 GitHub Web 介面點 PR |
| 主要任務 | 上傳教材、審核 LLM 產生的 PR、調整紅線/紅燈標記、Schema 修訂 |

### 2.2 角色 B：知識庫消費者（=我，作為講師）

| 場景 | 需要的輸出 |
|---|---|
| 設計新一場培訓 | 從特定產品 + 特定主題快速產出考題卷（選擇題/是非題） |
| 拍攝教學短片 | 1-3 分鐘短片的逐字腳本 + 鏡頭分鏡建議 |
| 教導門市人員 | 客戶展示腳本（1 分鐘 / 3 分鐘 / 10 分鐘三檔） |

### 2.3 角色 C：間接受益者

- 經銷商內部講師（我教他們、他們教門市人員）
- 授權經銷商門市人員（透過我的教學接收已加工的內容）
- **開源社群參與者**（未來對外階段才開放：其他 Apple 培訓工作者可瀏覽公開 wiki、提 Issue/PR）

---

## 3. 核心架構：三層 LLM-Wiki + 單一私有 Repo

採用 Karpathy LLM Wiki Pattern + 蘋果零售訓練領域客製。v0.3 以單一私有 repo
起步（ADR-023）。

### 3.1 Repo 架構（v0.3 變更）

```
┌─────────────────────────────────────────────────────────┐
│  PRIVATE REPO（單一，現階段）                              │
│  github.com/<org>/apple-llm-wiki                         │
│                                                         │
│  ├── wiki/                ← LLM 維護的二創知識（LLM 寫）   │
│  │   ├── index.md  log.md  DISCLAIMER.md                │
│  │   ├── products/  os/  concepts/  comparisons/        │
│  │   ├── sales-playbook/  demos/  weekly-digest/        │
│  ├── raw/                 ← 原始素材（LLM 只讀）          │
│  │   ├── apple-com/  apple-support/  apple-newsroom/    │
│  │   ├── developer-apple/  manual-uploads/              │
│  ├── apps/web/            ← Vite + React SPA             │
│  ├── apps/api/            ← Hono API (Cloudflare Workers)│
│  ├── ingest/              ← GitHub Actions ingest agent  │
│  ├── packages/            ← llm 抽象 / content schema     │
│  ├── sources-config.yaml                                │
│  ├── AGENTS.md            ← wiki schema（已完成 v1.0）    │
│  └── docs/                ← ADR / PRD / 規劃文件          │
└─────────────────────────────────────────────────────────┘
```

**單一私有 repo 的理由（v0.3）**：
- 起步階段內容不對外，版權暴露風險低，不需要立即用雙 repo 隔離。
- 單 repo 讓首次建置、審核與 CI 都簡單；非工程師團隊只需面對一個 repo。
- `raw/` 與 `wiki/` 仍是**邏輯兩層**（LLM 只讀 raw、只寫 wiki）。
- **未來拆分預留**：LLM 維持二創改寫、不複製原文（AGENTS.md §3.2、§5），日後要把
  `wiki/` 拆成公開 repo、`raw/` 留私有時，內容已是乾淨二創，可低成本拆出。

### 3.2 三層職責（單一 repo 內）

```
Layer 1 — Raw      :  raw/      (private)   LLM 只讀
Layer 2 — Wiki     :  wiki/     (private)   LLM 寫（經 PR）
Layer 3 — Schema   :  AGENTS.md (private)   人類寫，LLM 讀
```

### 3.3 雙語檔案命名規則

每一個概念頁面對應**兩個檔案**，以 `lang` 後綴區分：

```
products/
  iphone-17-pro.zh-TW.md
  iphone-17-pro.en.md
```

**Single Source of Truth (SSoT) 規則**（SSoT = Git 內的 Markdown，ADR-023）：
- 一頁的「**事實層**」（規格、價格、發表日期）由 Ingest Agent 同步維護兩語版本；
  發現不一致時必須標記 `> ⚠️ LANG-SYNC` 並停寫直到人工介入。
- 「**人工層**」（FAB+P 銷售話術、Signature Demo）兩語各自獨立撰寫，**不互譯**。
- 兩語文件的 frontmatter 必須在 `siblings:` 欄位互相引用，前端可一鍵切換。
- 詳細 schema 見 repo 根 `AGENTS.md` §3.1。

---

## 4. 內容範圍

### 4.1 涵蓋產品/主題（MVP）

| 類別 | 範圍 |
|---|---|
| 硬體產品 | iPhone（當前在售 3 代）、iPad（當前在售全系）、Mac（M 系列當前世代）、Apple Watch、AirPods、Vision Pro、HomePod |
| 作業系統 | 當前正式版 + **最新 Beta**（如 iOS 27 / macOS 27 / iPadOS 27 等 OS 27 系列） |
| 服務 | iCloud+、Apple Music、Apple TV+、Apple Arcade、Apple One、AppleCare+ |
| 概念/技術 | Apple Intelligence、MagSafe、ProMotion、Pro Display XDR、Continuity、Handoff、Find My、Family Sharing |
| 銷售技巧 | FAB+P 話術、客戶 Persona、反對處理、Signature Demo |

**Beta 內容處理**：
- Beta 頁面 frontmatter 必須帶 `status: beta` + `os_version: 27.0-beta3`（標明具體 build）
- 前端與所有產出物在 Beta 內容前後加 🧪 圖示與「Beta — 功能與發布日期可能變更」浮水印
- 正式版發布日，自動將 `status: beta` 頁面降權，並開 PR 邀請維護者比對「Beta vs 正式版」差異

**雙語涵蓋優先序**：MVP 階段先做繁中為主、英文為輔；T1 來源中已是英文者（如 developer.apple.com），英文版直接維護，繁中版由 LLM 翻譯但需人工審核 PR。

### 4.2 來源分級 (Source Tier)

對映 ADR-004 trust levels；詳細規則見 `AGENTS.md` §4。

| Tier | 來源範例 | ADR-004 對映 | 可寫入區塊 |
|---|---|---|---|
| **T1** | apple.com、support.apple.com、apple.com/newsroom、developer.apple.com、Apple 內部教材（手動上傳，**上傳者自行確認版權合規**） | official_primary / official_secondary | 全部章節（規格、價格、核心事實） |
| **T2** | 經銷商官方培訓教材（如 Ingram Micro、Synnex 提供的訓練資料） | trusted_secondary | 分析、銷售觀點章節（需配 T1 footnote） |
| **T2-filtered** | 知名 Apple 媒體（如 9to5Mac 的 review/、how-to/，**不含 rumors/**） | trusted_secondary | 同 T2，限產品上市後的評測類內容 |
| **T3** | 一般科技媒體 | community | 僅可進 weekly-digest 的「市場觀感」段落 |
| **T4** | 爆料、傳聞、分析師預測（MacRumors rumors/、Twitter 爆料） | （排除） | ❌ **完全禁止**（攔截於爬蟲層） |

> 此規則對 Apple 領域**特別重要**：因為 Apple 對未發表產品有嚴格保密政策，講師若提及未發表產品可能違反經銷商合約。

### 4.3 紅線 (Red Lines)

`AGENTS.md` §5 中強制 LLM 遵守：

1. ❌ **不寫未發表產品**（即使是 T1 來源外洩亦不採用）
2. ❌ **不寫具體折扣 / 促銷價**（只寫定價）
3. ❌ **不貶低競品**（可做客觀規格比較，禁人身/品牌攻擊）
4. ❌ **不承諾未官宣的上市日期**
5. ❌ **不引用 T4 來源**
6. ❌ **不複製 T1 原文段落** — 必須改寫為二創敘述（v0.3：即使在私有 repo 也維持，為未來拆公開預留乾淨路徑）
7. ✅ **存疑時 → 標記 `> 🟡 NEEDS REVIEW` 交人類裁決**

---

## 5. 功能需求

### 5.1 知識攝取 (Ingest)

#### F1.1 自動爬取（每週排程）

- 每週一 03:00 由 **GitHub Actions** 自動執行（ADR-024：重活在 Actions，不在 Workers）
- 爬取設定於 repo 的 `sources-config.yaml`，初期至少包含：
  - `apple.com/tw`、`apple.com`（繁中 + 英文產品頁）
  - `support.apple.com/zh-tw` + `support.apple.com/en-us`
  - `apple.com/newsroom`（含繁中與英文）
  - `developer.apple.com`（WWDC sessions、API 文件，主英文）
- 每篇文章寫入私有 repo 的 `raw/<source>/<YYYY-Www>/<slug>.html` + `.meta.json`
- 抓取策略沿用 ADR-010：HTTP first（undici/fetch + Cheerio），必要時 Playwright 後備

#### F1.2 手動上傳（隨時）

- 前端介面提供「**上傳教材**」按鈕
- 支援格式：PDF、PPTX、DOCX、TXT、MD、PNG/JPG（OCR）
- 可加註 metadata：`source_title`、`source_tier`（手動指定 T1/T2）、`tags`
- **版權狀態欄位**：上傳時必須勾選下列其中一項：
  - ☐ 我已確認本文件可作為內部培訓素材使用
  - ☐ Apple 官方公開教材（具公開授權）
  - ☐ 經銷商授權培訓教材（合約允許 LLM 處理）
  - ☐ 我自製內容（版權歸我團隊）
- 上傳檔案儲存於私有 repo 的 `raw/manual-uploads/`；wiki 中僅出現 LLM 改寫後的摘要與內部引用記號
- 重活（解析 PDF/DOCX/PPTX、OCR）由 GitHub Actions 處理（ADR-024）

> **法律責任分配**：版權合規由上傳者本人確認，系統不做版權檢查；上傳介面與第 11 節免責文字會明示此分配。

#### F1.3 相關性過濾 (Relevance Gate)

- T1 來源**直接通過**（已預設相關）
- T2 以下：LLM 評分 0-10，四維度（D1 直接提及 Apple 0-3、D2 生態系 0-2、D3 教材潛力 0-3、D4 時效性 0-2）
- < 5 分：跳過；5-6 分：待人工裁決；≥ 7 分：自動 ingest

#### F1.4 時效性內容處理（如 OS 27 Beta、WWDC 26）

- WWDC 期間提供「**衝刺模式**」：手動觸發 daily ingest
- Beta 內容自動加 `status: beta`、`os_version`，前端以 🧪 標示
- 所有 Beta 產出物自動追加 Beta Disclaimer

### 5.2 知識維護

#### F2.1 LLM Ingest Agent

對每筆通過過濾的來源（執行於 GitHub Actions）：
1. 讀取 raw 內容 + 相關現有 wiki 頁面
2. 產出 wiki **改寫**內容（**不可直接複製原文**，必須二創敘述）
3. 寫入 `index.md` 和 `log.md`
4. 自動處理雙語：繁中為主、英文為輔
5. 透過 Octokit 開啟私有 repo 的 PR
6. LLM provider 經 Vercel AI SDK 抽象，可切換模型（ADR-024）

#### F2.2 段落所有權保護

每個 wiki 頁面 frontmatter 宣告（schema 見 AGENTS.md §3.1）：
```yaml
ingest_managed_sections: [overview, specs, price, sources]
human_owned_sections: [selling_points, signature_demos, qa, objection_handling]
```
LLM **禁止**覆寫 `human_owned_sections` — 保護講師的話術心血。

#### F2.3 衝突與審核

- 新舊事實衝突：標記 `> ⚠️ CONFLICT (flagged YYYY-MM-DD)` 並保留兩版
- 雙語事實層不一致：標記 `> ⚠️ LANG-SYNC`
- 所有 ingest 以 PR 形式提交，由維護者於 GitHub Web 審核合併

#### F2.4 月度健檢 (Lint)

每月 1 號由 GitHub Actions 自動執行，產生健檢報告（清單見 AGENTS.md §10）：
- 過時頁面（last_updated > 60 天）、章節缺漏、雙語不對稱
- 未解 CONFLICT > 14 天、未解 NEEDS REVIEW > 30 天、孤兒頁面

#### F2.5 治理（v0.3：私有期 + 未來對外預留）

- **私有期（現在）**：僅 4 人團隊存取；變更一律走 PR；CI 在私有 repo 仍跑 lint
  （markdown、frontmatter schema、紅線掃描、雙語對稱、disclaimer 存在性）
- **未來對外階段（延後）**：拆出公開 wiki repo 時，再啟用 CODEOWNERS、外部 Issue/PR
  模板、「不接受外部直接提交 raw/」等公開治理規則(原 v0.2 §2.5/§8.3 內容)

### 5.3 知識輸出（前端介面）

產出器三類（考題 / 影片腳本 / 銷售腳本）的輸入、輸出格式與 FAB+P 規則**沿用
v0.2**（內容不變），詳細模板於 Phase 3 隨 AGENTS.md §8 細化。共通點：

- 每筆產出附**出處連結**回到 wiki 頁面（claim 級可追溯，ADR-003/012）
- 支援語系選擇（繁中 / 英文）
- 所有匯出格式檔頭自動帶 Disclaimer（讀取 `wiki/DISCLAIMER.md`，見 F3.4）
- 產出由獨立 Hono API 呼叫 LLM（經 Vercel AI SDK，可切換模型）

#### F3.1 考題產生器 / F3.2 影片腳本產生器 / F3.3 銷售展示腳本產生器

輸入欄位、輸出格式、FAB+P + 三流節奏、1 分鐘 Flash 版特殊規則、反規範拒答等
**均沿用 v0.2**，此處不重複。

#### F3.4 全域 Disclaimer 機制

所有產出物的標準 Disclaimer 由統一檔案 `wiki/DISCLAIMER.md` 管理；更新走 PR；
前端每次產出時自動讀取最新版本嵌入（內容見附錄 C，沿用 v0.2）。

---

## 6. 前端介面設計

前端為 **Vite + React SPA**（ADR-024，無 SEO 需求），部署於 Cloudflare Pages，
所有動態能力透過獨立 Hono API 取得。

### 6.1 頁面結構

```
┌──────────────────────────────────────────┐
│ Apple Training Wiki              🌐 🇹🇼  │
├──────────────────────────────────────────┤
│ 🏠 首頁  │  📚 瀏覽知識  │  ⚡ 產出工具  │
│         │                │  📤 上傳     │
│         │                │  📊 健檢報告 │
│                                          │
│  Disclaimer: 由 LLM 整理；非 Apple 官方   │
└──────────────────────────────────────────┘
```

### 6.2 主要流程

- **流程 A — 講師備課（最高頻）**：產出工具 → 選類型 → 選語系 → 填參數 → 預覽 → 編輯 → 匯出（含 Disclaimer）
- **流程 B — 上傳新教材**：上傳 → 填 metadata → **必填版權狀態勾選**（未勾選不能送出）→ 進私有 repo `raw/`，5 分鐘內可查詢
- **流程 C — 審核 PR**：收到通知 → 進 GitHub Repo → Diff Review → Approve/Comment/Reject
- 流程 D（外部 Issue/PR）延後到未來對外階段

### 6.3 介面原則

- **極簡**：每頁不超過 3 個主要操作
- **預覽即所得**、**可審計**（每段產出附出處連結回 wiki）
- **黑暗模式**、**語系切換**（右上角繁中/英文，記住偏好；以 react-i18next 實作）
- **Disclaimer 持續可見**：footer 永久顯示，非可關閉

---

## 7. 非功能需求

| 類別 | 需求 |
|---|---|
| **效能** | 考題產生 < 30 秒；3 分鐘腳本產生 < 60 秒；上傳檔案 ingest < 5 分鐘 |
| **可用性** | 99% uptime（單點失敗可接受，週末維護視窗 OK） |
| **安全** | 單一**私有** repo 僅 4 人團隊可存取；前端產出工具要求 Auth0 登入；API 驗證 Auth0 JWT |
| **稽核** | 每筆 wiki 變更必有 `log.md` 紀錄 + PR 連結 |
| **成本** | LLM 月開銷 < USD $200（4 人團隊規模）；可選 Cloudflare AI Gateway 做用量觀測/限流 |
| **可維運** | 4 人團隊月維護工時 < 32 小時 |
| **合規** | 遵守 §4.3 紅線；所有產出可由人類追溯來源 |
| **法律** | 所有產出物含 Disclaimer；上傳教材版權責任歸上傳者；私有 repo 降低暴露風險 |

---

## 8. 技術架構

技術選型正式記錄於 **ADR-024**（Cloudflare-first）。

### 8.1 高層架構

```
┌─────────────────┐     ┌─────────────────┐
│ Apple 公開官網   │     │ 維護者上傳教材   │
│ (apple.com 等)  │     │ (PDF/PPTX/...) │
└────────┬────────┘     └────────┬────────┘
         │ 排程爬蟲              │ 即時上傳
         ▼                       ▼
   ┌──────────────────────────────────┐
   │ GitHub Actions（重活）            │
   │ 爬蟲 / 解析 / OCR / ingest agent  │
   │ LLM 改寫(二創) · 雙語 · Octokit PR│
   └────────────────┬─────────────────┘
                    │ Git PR
                    ▼
   ┌──────────────────────────────────┐
   │ 單一私有 GitHub Repo              │
   │  raw/（LLM 只讀） wiki/（LLM 寫） │
   │  AGENTS.md = schema              │
   └────────────────┬─────────────────┘
                    │ 讀取
                    ▼
   ┌──────────────────────────────────┐
   │ 獨立 API：Hono (Cloudflare Workers)│
   │  產出器 / 提取 / 認證驗證 / 讀 wiki │
   │  LLM 經 Vercel AI SDK（可切換）    │
   │      └→（可選）Cloudflare AI Gateway│
   └────────────────┬─────────────────┘
                    │ HTTP
                    ▼
   ┌──────────────────────────────────┐
   │ 前端：Vite + React SPA            │
   │  (Cloudflare Pages) · Auth0 登入  │
   │  三大產出器 + Disclaimer 注入      │
   └────────────────┬─────────────────┘
                    ▼
              使用者（講師）
```

### 8.2 技術棧（ADR-024）

| 層 | 選用 | 部署 |
|---|---|---|
| 語言 | TypeScript on Node.js | — |
| 前端 | Vite + React SPA + Tailwind | Cloudflare Pages |
| 獨立 API | Hono | Cloudflare Workers |
| LLM | Vercel AI SDK（provider 可切換）+ 可選 Cloudflare AI Gateway | Workers |
| 認證 | Auth0 + GitHub OAuth（Workers 驗 JWT） | — |
| 排程/重活 | GitHub Actions（爬蟲、解析、OCR、ingest agent、Octokit PR） | GitHub |
| 抓取/解析 | undici/fetch + Cheerio，Playwright 後備 | GitHub Actions |
| Markdown | gray-matter + remark | — |
| 驗證 | Zod | — |
| 測試/Lint | Vitest + Biome | — |
| i18n | react-i18next | 前端 |
| 檔案處理 | pdf-parse、mammoth(DOCX)、PPTX 解析、OCR | GitHub Actions |
| 儲存 | 單一私有 GitHub repo；大檔未來可選 Cloudflare R2 | — |

### 8.3 CI 與治理

- **CI（私有期就跑）**：Markdown lint、Frontmatter schema 驗證、紅線關鍵字掃描、
  雙語對稱性檢查、Disclaimer 存在性檢查
- **開源治理（延後到對外階段）**：License（程式碼 MIT、wiki 內容 CC BY-NC-SA 4.0）、
  CODEOWNERS、Branch Protection 等，待拆出公開 repo 時啟用

---

## 9. 階段規劃

### Phase 1：MVP（Week 1-6）

**目標**：手動 ingest + 1 個產出器，驗證 Wiki Schema 設計（AGENTS.md v1.0 已完成）

- [ ] Week 1：手寫 3 個示範頁面繁中版（iPhone 17 Pro / iOS 27 / Apple Intelligence），壓力測試 AGENTS.md schema
- [ ] Week 2：3 個示範頁面英文版 + 確認 frontmatter/章節範本，跑通手動編輯 → Git PR 流程
- [ ] Week 3：撰寫 `wiki/DISCLAIMER.md` v1.0；建立 CI lint（markdown/frontmatter/紅線/雙語/disclaimer）
- [ ] Week 4：建前端骨架（Vite + React SPA + Cloudflare Pages）+ 獨立 Hono API（Workers）+ Auth0 登入 + 「考題產生器」，含雙語切換與 Disclaimer 注入
- [ ] Week 5：手動上傳功能（PDF/DOCX）+ 版權狀態勾選 UI（重活走 Actions）
- [ ] Week 6：MVP 內部試用，收集回饋

### Phase 2：自動 Ingest（Week 7-12）

- [ ] GitHub Actions 爬蟲（Apple 官網 / Newsroom，繁中 + 英文）
- [ ] Relevance Filter
- [ ] LLM Ingest Agent（二創改寫、雙語同步、Vercel AI SDK 抽象、Octokit PR）
- [ ] 月度 Lint 健檢

### Phase 3：完整產出器（Week 13-18）

- [ ] 影片腳本產生器（Pass 1 + Pass 2）、銷售展示腳本產生器（FAB+P + 三長度版本）
- [ ] AGENTS.md §8 產出器模板細化
- [ ] 段落所有權保護、衝突標記流程、全域 Disclaimer 動態注入

### Phase 4：擴張（Week 19+）

- [ ] 加入 T2 來源（9to5Mac review/）、比較頁面、客戶 Persona 自訂編輯器、WWDC 衝刺模式最佳化
- [ ] **評估拆出公開 wiki repo**（啟用 §8.3 開源治理）並向 Apple 培訓圈推廣

---

## 10. 成功指標 (KPIs)

| 階段 | KPI | 目標值 |
|---|---|---|
| MVP | 首場培訓備課時間 | < 1 小時（原 4 小時） |
| MVP | 雙語頁面初始覆蓋 | 3 個示範主題各語完備 |
| Phase 2 | 每週新增 wiki 頁面數（自動 ingest） | ≥ 5 頁 |
| Phase 2 | 雙語覆蓋率 | ≥ 80%（zh-TW ↔ en 對稱） |
| Phase 3 | 講師滿意度（4 人團隊問卷） | ≥ 4.0/5.0 |
| Phase 4 | 月維護工時 | < 8 小時/人 |
| 全期 | LLM 產出物可直接使用比例 | ≥ 70% |
| 全期 | 紅線違反次數（PR 審核擋下） | 持續為 0 |
| 全期 | 法律糾紛 / 版權申訴 | 0 件 |
| 對外階段（拆公開 repo 後） | 公開 repo Stars / 外部 PR 接受數 | > 50 / > 10 |

---

## 11. 風險與限制

| 風險 | 嚴重度 | 緩解 |
|---|---|---|
| **Apple 商標 / 內容版權** | 🟡 中（私有期降低） | 私有 repo 不對外；wiki 內容皆為 LLM 二創；DISCLAIMER 明示與 Apple 無關聯；未來拆公開前內容已是乾淨二創 |
| **未發表產品紅線** | 🔴 高 | 爬蟲層攔截 T4；T1 內容也須人工審核才能寫入 |
| **手動上傳教材版權糾紛** | 🟡 中 | 上傳介面強制版權狀態勾選；上傳者承擔合規責任；原始檔僅進私有 repo |
| **LLM 幻覺** | 🟡 中 | 所有事實必須 footnote（claim 級可追溯）；NEEDS REVIEW 強制機制；產出物 Disclaimer |
| **Apple 官網大改版** | 🟡 中 | 爬蟲解析失敗時自動降級到「等待人工」狀態 |
| **Cloudflare Workers runtime 限制** | 🟡 中 | 重活（爬蟲/解析/OCR/Playwright）一律放 GitHub Actions，Workers 只跑即時 API（ADR-024） |
| **Beta 內容造成誤導** | 🟢 低 | Beta 標示明確 + Disclaimer 自動追加；正式版發布日強制比對 |
| **小團隊維護斷層** | 🟢 低 | AGENTS.md 是教材，新成員可自學；流程都走 PR |
| **雙語不對稱導致學員混淆** | 🟢 低 | Lint 檢查 + 月度健檢 + 前端清楚標示 |
| **未來拆公開 repo 的歷史外洩** | 🟢 低（預留） | 拆分時以乾淨子樹/新 repo 方式，不帶 raw/ 歷史 |

---

## 12. 已決議事項

v0.2 已決議（Q1–Q5）維持有效；v0.3 新增架構與技術決議（A1–A8），記錄於 ADR-023 / ADR-024。

| # | 主題 | 決議 | 依據 |
|---|---|---|---|
| Q1 | Repo 託管 | GitHub（v0.3 起以單一私有 repo 起步，未來再拆公開/私有） | ADR-023 |
| Q2 | 語系策略 | 繁中 + 英文並行；雙檔命名；事實層同步、人工層獨立 | AGENTS.md |
| Q3 | 手動上傳版權 | 上傳者自行確認；前端強制勾選；系統不審核 | §5.1 F1.2 |
| Q4 | 產出物法律責任 | 所有產出含 Disclaimer；統一管於 `wiki/DISCLAIMER.md` | §5.3 F3.4 |
| Q5 | Beta 內容對外 | 同意對外；強制 `status: beta` + Beta Disclaimer 追加 | §4.1 |
| A1 | Repo 架構 | 單一私有 repo 起步，未來再拆 | ADR-023 |
| A2 | 前端 | Vite + React SPA | ADR-024 |
| A3 | API | 獨立 Hono API（Cloudflare Workers） | ADR-024 |
| A4 | LLM | Vercel AI SDK 可切換 + 可選 Cloudflare AI Gateway | ADR-024 |
| A5 | 認證 | Auth0 + GitHub OAuth | ADR-024 |
| A6 | 部署 | Cloudflare（Pages + Workers）+ GitHub | ADR-024 |
| A7 | 開源/公開治理 | 延後到對外階段 | ADR-023 |
| A8 | wiki schema | AGENTS.md v1.0 已完成 | `/AGENTS.md` |

---

## 13. 附錄

### A. 範例 Wiki 頁面結構

產品頁（繁中版）範例沿用 v0.2 附錄 A（frontmatter + Overview/Specs/Price/
Selling Points (FAB+P)/Signature Demos/Q&A/Sources）。正式 schema 以 repo 根
`AGENTS.md` §3.1、§8 為準。

### B. AGENTS.md

**已實作為 v1.0**，見 repo 根 [`/AGENTS.md`](../AGENTS.md)。章節：0 Purpose & Roles、
1 Repo Structure、2 Ingest Workflow、3 Page-wide Rules、4 Source Trust & Tiers、
5 Red Lines、6 Freshness & Lifecycle、7 Claim-Level Traceability、8 Page
Templates（骨架，Phase 3 細化）、9 Conflict/Review/PR States、10 Lint Checklist、
11 Disclaimer、12 Raw Data Layer Spec、13 Version History。

### C. DISCLAIMER.md v1.0 草案

沿用 v0.2 附錄 C（繁中 + 英文雙語免責聲明）。實作時建立於 `wiki/DISCLAIMER.md`。

### D. 公開 repo 門面（README）— 延後

v0.2 附錄 D 的公開 repo README 草案，待 Phase 4 拆出公開 wiki repo 時再採用。
私有期間以現有的 repo 根 README（中英）為準。

---

**End of PRD v0.3**

---

**下一步建議（按優先順序）**

1. **手寫 3 份示範 Wiki 頁面**（iPhone 17 Pro / iOS 27 / Apple Intelligence）繁中與英文，純 Markdown — 壓力測試 AGENTS.md v1.0 schema
2. 建立 `wiki/` 目錄骨架 + `DISCLAIMER.md` + `sources-config.yaml`
3. Scaffold 前端（Vite + React SPA）+ 獨立 Hono API + Auth0 登入骨架
4. 建立 CI lint（markdown / frontmatter / 紅線 / 雙語 / disclaimer）
5. 確認團隊 2-3 人對「人類審核 PR」流程沒有抗拒（系統的人類閘門）
