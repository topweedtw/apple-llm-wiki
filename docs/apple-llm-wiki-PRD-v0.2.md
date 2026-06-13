# PRD — Apple 產品知識 LLM-Wiki 平台

> **已由 v0.3 取代** — 見 [apple-llm-wiki-PRD-v0.3.md](apple-llm-wiki-PRD-v0.3.md)。
> 本版（雙 repo + Next.js/Vercel 假設）保留作歷史；目前架構與技術棧以 v0.3、
> ADR-023、ADR-024 為準。

**文件版本**：v0.2
**作者**：Willer（企業講師）
**最後更新**：2026-06-12
**狀態**：草案 — Stakeholder 決議已納入，待開發團隊評估
**前一版**：v0.1（含 5 項開放問題待決）

---

## 變更摘要 (v0.1 → v0.2)

v0.1 第 12 節的 5 項開放問題已由 Stakeholder 決議，本版反映以下決定：

| # | 主題 | 決議 | 影響章節 |
|---|---|---|---|
| Q1 | Repo 託管 | **公開 GitHub** | §3, §7, §8, §11 |
| Q2 | 語系策略 | **繁體中文 + 英文 並行** | §4, §5, §13 |
| Q3 | 手動上傳教材版權 | 由 Stakeholder 自行確認合規（系統不負責審核） | §5.1, §11 |
| Q4 | 產出物法律責任 | **所有產出加入 Disclaimer** | §5.3, §6, §11 |
| Q5 | Beta 內容對外 | **同意對外**（仍須清楚標示） | §4.1, §5.1 |

> **架構級調整**：因公開 GitHub 託管會牽涉到 `/raw/` 中爬取/上傳內容的版權，本版將原本單一 repo 拆為「**公開 Wiki Repo + 私有 Raw Repo**」雙 repo 架構（詳見 §3.1）。

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

並以**公開 GitHub 開源形式**運作，為亞太地區 Apple 經銷商培訓社群建立一個可協作的知識基礎設施。

### 1.3 目標 (Goals)

| # | 目標 | 衡量指標 |
|---|---|---|
| G1 | 建立 Apple 全產品線（iPhone / iPad / Mac / Watch / Vision / 服務 / OS）繁中+英文雙語結構化知識庫 | 涵蓋當前在售全產品 + 最新 OS 版本，雙語覆蓋率 ≥ 90% |
| G2 | 自動爬取公開官網內容，並支援手動上傳教材 | 每週自動更新 + 上傳 PDF/PPT/DOCX 後 < 5 分鐘可查詢 |
| G3 | 提供前端介面快速產出三類教學素材：考題、影片腳本、銷售展示稿 | 講師備課時間從 4 小時/場 → < 1 小時/場 |
| G4 | 在 2-3 人小團隊規模下可永續維護 | 月維護工時 < 8 小時/人 |
| G5 | 建立可被 Apple 培訓圈引用的開源知識庫 | 公開 repo Stars > 50、外部 PR 貢獻者 > 5（Phase 4 後） |

### 1.4 非目標 (Non-Goals)

- ❌ 不做面向終端消費者的問答產品（這是給講師用的後台工具）
- ❌ 不複製 Apple 官網功能、不替代 Apple 官方訓練平台 (SEED / Sales Training)
- ❌ 不做即時影音生成（只產出腳本與分鏡建議，不產出影片本身）
- ❌ 不在公開 repo 中存放任何具版權爭議的原始素材（見 §3.1 雙 repo 架構）

---

## 2. 使用者與角色

### 2.1 角色 A：知識庫維護者（核心使用者）

| 屬性 | 說明 |
|---|---|
| 人數 | 3-4 人（我 + 2-3 名團隊成員） |
| 技術背景 | 一般使用者，**非工程師**；熟悉 Mac/iOS、會用 Markdown、能進 GitHub Web 介面點 PR |
| 主要任務 | 上傳教材、審核 LLM 產生的 PR、調整紅線/紅燈標記、Schema 修訂、處理外部 Issue/PR |

### 2.2 角色 B：知識庫消費者（=我，作為講師）

| 場景 | 需要的輸出 |
|---|---|
| 設計新一場培訓 | 從特定產品 + 特定主題快速產出考題卷（選擇題/是非題） |
| 拍攝教學短片 | 1-3 分鐘短片的逐字腳本 + 鏡頭分鏡建議 |
| 教導門市人員 | 客戶展示腳本（1 分鐘 / 3 分鐘 / 10 分鐘三檔） |

### 2.3 角色 C：間接受益者

- 經銷商內部講師（我教他們、他們教門市人員）
- 授權經銷商門市人員（透過我的教學接收已加工的內容）
- **開源社群參與者**（其他 Apple 培訓相關工作者，可瀏覽公開 wiki、提 Issue/PR）— v0.2 新增

---

## 3. 核心架構：三層 LLM-Wiki + 雙 Repo

採用 Karpathy LLM Wiki Pattern + 蘋果零售訓練領域客製，並因應公開託管調整為雙 repo 設計。

### 3.1 雙 Repo 架構（v0.2 變更）

```
┌─────────────────────────────────────────────────────────┐
│  PUBLIC REPO: github.com/<org>/apple-training-wiki      │
│  License: CC BY-NC-SA 4.0 (內容) + MIT (程式碼)          │
│                                                         │
│  ├── wiki/                ← LLM 維護的二創知識           │
│  │   ├── AGENTS.md                                      │
│  │   ├── index.md                                       │
│  │   ├── log.md                                         │
│  │   ├── products/                                      │
│  │   │   ├── iphone-17-pro.zh-TW.md                     │
│  │   │   └── iphone-17-pro.en.md                        │
│  │   ├── os/                                            │
│  │   ├── concepts/                                      │
│  │   ├── comparisons/                                   │
│  │   ├── sales-playbook/                                │
│  │   ├── demos/                                         │
│  │   └── weekly-digest/                                 │
│  ├── sources-config.yaml  ← 來源設定（URL / Tier）       │
│  ├── frontend/            ← Next.js 前端                 │
│  ├── ingest/              ← Ingest Agent 程式碼          │
│  ├── README.md            ← 公開門面 + Disclaimer        │
│  ├── DISCLAIMER.md        ← 法律免責聲明                 │
│  └── LICENSE                                             │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │ 只引用 URL + 摘要，不複製原文
                            │
┌─────────────────────────────────────────────────────────┐
│  PRIVATE REPO: github.com/<org>/apple-training-raw      │
│  Visibility: Private (僅 4 人團隊可存取)                 │
│                                                         │
│  └── raw/                 ← 原始素材（具版權內容）        │
│      ├── apple-com/                                     │
│      ├── apple-support/                                 │
│      ├── apple-newsroom/                                │
│      ├── developer-apple/                               │
│      └── manual-uploads/  ← 手動上傳教材                │
│          └── (每筆附 .meta.json + 版權狀態欄位)          │
└─────────────────────────────────────────────────────────┘
```

**雙 repo 設計理由**：
- **Public Wiki Repo**：LLM 二創產出物，是「事實 + 結構化的演繹」，受合理使用 / 二創保護，可開源；同時讓社群可見、可貢獻。
- **Private Raw Repo**：原始爬取頁面 HTML、上傳的 PDF/PPT 等具版權素材，不對外公開；只有 Ingest Agent 與授權維護者可存取。
- 兩個 repo 透過 `source_url` + `content_hash` 在 `.meta.json` 與 wiki footnote 之間建立可追溯連結，但**不會把原文複製到公開 repo**。

### 3.2 三層職責不變

```
Layer 1 — Raw      :  /raw/   (Private Repo)        LLM 只讀
Layer 2 — Wiki     :  /wiki/  (Public Repo)         LLM 寫
Layer 3 — Schema   :  AGENTS.md (Public Repo)       人類寫，LLM 讀
```

### 3.3 雙語檔案命名規則（v0.2 新增）

每一個概念頁面對應**兩個檔案**，以 `lang` 後綴區分：

```
products/
  iphone-17-pro.zh-TW.md
  iphone-17-pro.en.md
```

**Single Source of Truth (SSoT) 規則**：
- 一頁的「**事實層**」（規格、價格、發表日期）由 Ingest Agent 同步維護兩語版本；發現不一致時必須標記 `> ⚠️ LANG-SYNC` 並停寫直到人工介入。
- 「**人工層**」（FAB+P 銷售話術、Signature Demo）兩語各自獨立撰寫，**不互譯**（語感差異大；硬翻會破壞銷售話術張力）。
- 兩語文件的 frontmatter 必須包含對方檔名於 `siblings:` 欄位，前端可一鍵切換。

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

**Beta 內容處理（v0.2 決議：可對外）**：
- Beta 頁面 frontmatter 必須帶 `status: beta` + `os_version: 27.0-beta3`（標明具體 build）
- 前端與所有產出物在 Beta 內容前後加 🧪 圖示與「Beta — 功能與發布日期可能變更」浮水印
- 正式版發布日，自動將 `status: beta` 頁面降權，並開 PR 邀請維護者比對「Beta vs 正式版」差異

**雙語涵蓋優先序**：MVP 階段先做繁中為主、英文為輔；T1 來源中已是英文者（如 developer.apple.com），英文版直接維護，繁中版由 LLM 翻譯但需人工審核 PR。

### 4.2 來源分級 (Source Tier)

| Tier | 來源範例 | 可寫入區塊 |
|---|---|---|
| **T1** | apple.com、support.apple.com、apple.com/newsroom、developer.apple.com、Apple 內部教材（手動上傳，**Stakeholder 自行確認版權合規**） | 全部章節（規格、價格、核心事實） |
| **T2** | 經銷商官方培訓教材（如 Ingram Micro、Synnex 提供的訓練資料） | 分析、銷售觀點章節（需配 T1 footnote） |
| **T2-filtered** | 知名 Apple 媒體（如 9to5Mac 的 review/、how-to/，**不含 rumors/**） | 同 T2，限產品上市後的評測類內容 |
| **T3** | 一般科技媒體 | 僅可進 weekly-digest 的「市場觀感」段落 |
| **T4** | 爆料、傳聞、分析師預測（MacRumors rumors/、Twitter 爆料） | ❌ **完全禁止**（攔截於爬蟲層） |

> 此規則對 Apple 領域**特別重要**：因為 Apple 對未發表產品有嚴格保密政策，講師若提及未發表產品可能違反經銷商合約。

### 4.3 紅線 (Red Lines)

`AGENTS.md` 中強制 LLM 遵守：

1. ❌ **不寫未發表產品**（即使是 T1 來源外洩亦不採用）
2. ❌ **不寫具體折扣 / 促銷價**（只寫定價）
3. ❌ **不貶低競品**（可做客觀規格比較，禁人身/品牌攻擊）
4. ❌ **不承諾未官宣的上市日期**
5. ❌ **不引用 T4 來源**
6. ❌ **不複製 T1 原文段落到公開 wiki repo** — 必須改寫為二創敘述（v0.2 新增，因公開託管）
7. ✅ **存疑時 → 標記 `> 🟡 NEEDS REVIEW` 交人類裁決**

---

## 5. 功能需求

### 5.1 知識攝取 (Ingest)

#### F1.1 自動爬取（每週排程）

- 每週一 03:00 自動執行
- 爬取設定於公開 repo 的 `sources-config.yaml`，初期至少包含：
  - `apple.com/tw`（繁中產品頁）
  - `apple.com`（英文產品頁）
  - `support.apple.com/zh-tw` + `support.apple.com/en-us`
  - `apple.com/newsroom`（含繁中與英文）
  - `developer.apple.com`（WWDC sessions、API 文件，主英文）
- 每篇文章寫入 **私有** Raw Repo `raw/<source>/<YYYY-Www>/<slug>.html` + `.meta.json`
- 爬取得到的內容**不直接出現在公開 wiki**；公開 wiki 僅引用其 URL 與 LLM 改寫後的事實摘要

#### F1.2 手動上傳（隨時）

- 前端介面提供「**上傳教材**」按鈕
- 支援格式：PDF、PPTX、DOCX、TXT、MD、PNG/JPG（OCR）
- 可加註 metadata：`source_title`、`source_tier`（手動指定 T1/T2）、`tags`
- **版權狀態欄位（v0.2 新增）**：上傳時必須勾選下列其中一項：
  - ☐ 我已確認本文件可作為內部培訓素材使用
  - ☐ Apple 官方公開教材（具公開授權）
  - ☐ 經銷商授權培訓教材（合約允許 LLM 處理）
  - ☐ 我自製內容（版權歸我團隊）
- 上傳檔案儲存於**私有** Raw Repo；公開 wiki 中僅出現 LLM 改寫後的摘要與內部引用記號（如 `[internal-mat-2026-001]`，不附原文超連結）
- 上傳後自動觸發 ingest 流程

> **法律責任分配**：版權合規由上傳者本人確認，系統不做版權檢查；上傳介面與 PRD 第 11 節的免責文字會明示此分配。

#### F1.3 相關性過濾 (Relevance Gate)

- T1 來源**直接通過**（已預設相關）
- T2 以下：LLM 評分 0-10，包含四個維度：
  | 維度 | 權重 | 說明 |
  |---|---|---|
  | D1 直接提及 Apple 產品/服務 | 0-3 | |
  | D2 生態系/相鄰技術 | 0-2 | iOS/Swift/HomeKit 等 |
  | D3 教材潛力 | 0-3 | 可變章節、反對處理、Demo 步驟 |
  | D4 時效性 | 0-2 | 當前產品 > 已停產 |
- < 5 分：跳過；5-6 分：待人工裁決；≥ 7 分：自動 ingest

#### F1.4 時效性內容處理（如 OS 27 Beta、WWDC 26）

- WWDC 期間提供「**衝刺模式**」：手動觸發 daily ingest
- Beta 版本內容自動加 frontmatter `status: beta`、`os_version: 27.0-beta1`
- 前端顯示 Beta 內容時以 🧪 圖示標示
- 所有 Beta 內容產出物的 Disclaimer 自動追加：「本內容基於 Beta 版本，正式版發布前功能與規格可能變動」

### 5.2 知識維護

#### F2.1 LLM Ingest Agent

對每筆通過過濾的來源：
1. 讀取 raw 內容（私有 repo）+ 相關現有 wiki 頁面（公開 repo）
2. 產出 wiki **改寫**內容（**不可直接複製原文**，必須二創敘述以避免版權爭議）
3. 寫入 `index.md` 和 `log.md`
4. 自動處理雙語：繁中為主、英文為輔；若該 source 是英文且無對應繁中頁面，先建英文頁，再排隊翻譯為繁中
5. 開啟 Public Wiki Repo 的 PR

#### F2.2 段落所有權保護

每個 wiki 頁面 frontmatter 宣告：
```yaml
ingest_managed_sections: [specs, price, sources, overview]
human_owned_sections: [selling_points, signature_demos, qa, objection_handling]
```
LLM **禁止**覆寫 `human_owned_sections` — 保護講師的話術心血。

#### F2.3 衝突與審核

- LLM 發現新舊事實衝突時，標記 `> ⚠️ CONFLICT (flagged YYYY-MM-DD)` 並保留兩版內容
- 雙語間發現事實層不一致：標記 `> ⚠️ LANG-SYNC`
- 所有 ingest 必須以 PR 形式提交至公開 repo，由維護者於 GitHub Web 審核合併

#### F2.4 月度健檢 (Lint)

每月 1 號自動執行，產生健檢報告：
- 過時頁面（last_updated > 60 天）
- 章節缺漏
- 雙語不對稱（單語存在另一語缺失）
- 未解 CONFLICT > 14 天
- 未解 NEEDS REVIEW > 30 天
- 孤兒頁面

#### F2.5 公開 Repo 治理（v0.2 新增）

因公開託管，需處理外部互動：
- 前端 README 明確說明：「我們歡迎 Issue 與 PR；但出於版權考量，**不接受外部直接提交 raw/ 目錄的內容**，所有原始素材變更請由維護團隊處理」
- 設定 GitHub CODEOWNERS：`/wiki/sales-playbook/`、`/wiki/demos/` 等人工層只允許團隊核心 4 人合併
- Issue 模板：「事實錯誤回報」「Beta 變更同步」「術語建議」三類

### 5.3 知識輸出（前端介面）

#### F3.1 考題產生器

**輸入欄位**：
- 主題（產品 / OS / 概念）— 多選
- 題型：選擇題 / 是非題（多選）
- 題目數量：1-50 題
- 難度：入門 / 中階 / 進階
- 受測者：經銷商講師 / 門市人員 / 自選
- **語系**：繁中 / 英文（v0.2 新增）

**輸出格式**：

```markdown
> ⚠️ Disclaimer: 本考題由 LLM 自動產生，僅供內部培訓參考；
> 所有事實以 Apple 官方公告為準。本知識庫與 Apple Inc. 無關聯。

## 第 1 題（選擇題，難度：中階）

iPhone 17 Pro 的 Camera Control 按鍵主要功能是什麼？

A. 啟動 Apple Intelligence
B. 一鍵啟動相機並提供觸控對焦／變焦
C. 快速切換 Action Mode
D. 啟動 Emergency SOS

**正解**：B
**解析**：Camera Control 是 iPhone 17 Pro 新增的硬體按鍵，可一鍵啟動相機 app，並透過半按/全按/輕滑提供對焦、曝光、變焦控制。
**出處**：[[products/iphone-17-pro]] §硬體規格
**對應 Tag**：#camera #iphone-17-pro
```

**功能特色**：
- 每題附**出處連結**回到 wiki 頁面（可審計）
- 支援匯出 Markdown / DOCX / Kahoot / Google Form
- 所有匯出格式檔頭自動帶 Disclaimer

#### F3.2 教學影片腳本產生器

**輸入**：
- 主題
- 目標觀眾：講師研習 / 門市新人 / 進階銷售
- 影片長度：1 / 3 / 5 / 10 分鐘
- 風格：開箱介紹 / 功能教學 / Demo 演示 / 反對處理
- **語系**：繁中 / 英文

**輸出**：兩段式（**草稿先行 → 確認後生時序版**）

**Pass 1 — 敘事草稿**（純文字，200-400 字）
- 第一人稱講師口吻
- 明列引用 wiki 哪些章節
- 結尾：「這個敘事結構可以嗎？OK 我就生成有時碼的版本」

**Pass 2 — 時碼分鏡腳本**：
```
> ⚠️ Disclaimer: 本腳本由 LLM 整理產出，正式錄製前請與最新 Apple 官方資訊核對。

[00:00-00:05] 開場
   📷 鏡位：中景，講師正面
   🗣️ 旁白：「今天我們來看 iPhone 17 Pro 全新的 Camera Control。」
   📺 字卡：「Camera Control — 一鍵專業攝影」

[00:05-00:25] Demo 1 — 一鍵啟動
   📷 鏡位：手部特寫
   🗣️ 旁白：「不論在哪個畫面，按一下，相機就開了。」
   👀 觀眾看到：螢幕鎖定畫面 → 按下 → 相機 app 開啟
   ...
```

#### F3.3 銷售展示腳本產生器

**輸入**：
- 產品
- 客戶 Persona：學生 / 上班族 / 攝影愛好者 / 銀髮族 / 自訂
- 長度：1 分鐘（Flash）/ 3 分鐘（Core）/ 10 分鐘（Full）
- 重點功能：1-3 個（從 wiki 自動列出該產品的 selling points 給選）
- **語系**：繁中 / 英文

**輸出格式（採 FAB+P + 三流節奏）**：

```markdown
> ⚠️ Disclaimer: 本展示腳本由 LLM 整理產出，僅供培訓參考；
> 實際對客戶承諾任何規格、功能、價格前，請務必以 Apple 官方資訊為準。

## 3 分鐘示範稿 — iPhone 17 Pro 給「攝影愛好者」客戶

### 開場（0:00-0:15）
👉 動作：把展示機從正面 45 度角朝向客戶
🗣️ 話術：「您之前說喜歡拍人像，這台您一定要摸看看。」
👀 客戶看到：iPhone 17 Pro 的鈦金屬機身在燈光下的反射

### Demo — Camera Control（0:15-1:30）
**(F)** 全新 Camera Control 硬體按鍵
**(A)** iPhone 史上首見的攝影專屬實體按鍵
**(B-攝影愛好者)** 您不用再從口袋掏出相機，按一下，3 秒內就開始拍
**(P)** [請填入您自己的故事]

   👉 動作：手指放在 Camera Control 上，按下
   🗣️ 話術：「半按對焦，全按拍照，輕滑變焦 — 跟單眼一樣。」
   👀 客戶看到：螢幕從鎖定畫面瞬間跳到相機，對焦框跟著手指移動
   ✋ 客戶上手：「您試試半按看看？」← 內生效應 (endowment effect)

### 收尾（2:30-3:00）
🗣️ 話術：「所以 Camera Control 對您來說，就是把專業攝影的反應速度，戴進口袋。」
🎯 CTA：「要不要再看 ProRAW 的拍攝示範？」
```

**1 分鐘 Flash 版的特殊規則**：
- ❌ 不開 app — 把裝置當「實物展示」
- ❌ 不講 AI / Zoom / 生態整合（這些需要操作展示）
- ✅ 只講可物理感知的賣點（顏色、重量、按鍵、螢幕反光、鈦金屬質感）
- ✅ 收尾是輕邀請：「歡迎再來看 3 分鐘的完整示範」（而非硬式 closing）

**反規範拒答**：若 wiki 中該產品的 selling points **沒有** FAB+P 結構化欄位，產生器**拒絕生成**並在 `log.md` 標記該頁面待補充。

#### F3.4 全域 Disclaimer 機制（v0.2 新增）

所有產出物（考題 / 影片腳本 / 銷售腳本）的標準 Disclaimer 由統一檔案 `wiki/DISCLAIMER.md` 管理，包含：

```
本內容由 LLM 從公開資料整理產出，僅供內部培訓與教學參考使用。

• 所有事實、規格、價格以 Apple Inc. 官方公告為準。
• 本知識庫為獨立社群維護，與 Apple Inc. 無關聯，不代表 Apple 官方立場。
• Apple、iPhone、iPad、Mac、Apple Watch 等為 Apple Inc. 之商標。
• Beta 版本相關內容於正式版發布前可能變動。
• 銷售展示腳本中的個人故事（FAB+P 中的 P）需由講師/銷售人員填入真實經驗，
  不得使用 LLM 虛構之故事。
• 對客戶之任何規格、功能、價格承諾，請務必以 Apple 官方資訊為準；
  本內容造成之商業損失，由使用者自行承擔。

最後更新：YYYY-MM-DD
```

更新此檔需走 PR；前端每次產出時自動讀取最新版本嵌入。

---

## 6. 前端介面設計

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

#### 流程 A：講師備課（最高頻使用）
1. 進入「⚡ 產出工具」
2. 選擇輸出類型（考題 / 影片腳本 / 銷售腳本）
3. 選擇語系
4. 填寫參數
5. 預覽 → 編輯 → 匯出（含 Disclaimer）

#### 流程 B：上傳新教材
1. 進入「📤 上傳」
2. 拖放檔案 + 填 metadata
3. **必填**：版權狀態勾選（v0.2 新增，未勾選不能送出）
4. 系統自動 ingest 至**私有** Raw Repo，5 分鐘內可查詢

#### 流程 C：審核 PR
1. 收到 Slack/Email 通知「LLM 提交 N 個變更」
2. 點連結進公開 GitHub Repo
3. Diff Review → Approve/Comment/Reject

#### 流程 D：處理外部 Issue/PR（v0.2 新增）
1. 外部使用者透過公開 repo 開 Issue 或 PR
2. 維護者審視 → 若涉及人工層或敏感內容，引導至討論串；若為事實錯誤，直接修正
3. 拒絕涉及 raw/ 內容的外部 PR（提示改用 Issue 通報）

### 6.3 介面原則

- **極簡**：每頁不超過 3 個主要操作
- **預覽即所得**：所有產出在前端可即時預覽
- **可審計**：每段產出都附「出處連結」回到 wiki
- **黑暗模式**：符合 Apple 美學偏好
- **語系切換**：每頁右上角繁中/英文切換按鈕，記住使用者偏好
- **Disclaimer 持續可見**：footer 永久顯示，非可關閉

---

## 7. 非功能需求

| 類別 | 需求 |
|---|---|
| **效能** | 考題產生 < 30 秒；3 分鐘腳本產生 < 60 秒；上傳檔案 ingest < 5 分鐘 |
| **可用性** | 99% uptime（單點失敗可接受，週末維護視窗 OK） |
| **安全** | 私有 Raw Repo 僅 4 人團隊可存取；公開 Wiki Repo 內容可被全網閱讀（已假設無敏感內容）；前端產出工具要求帳密登入 |
| **稽核** | 每筆 wiki 變更必有 `log.md` 紀錄 + PR 連結 |
| **成本** | LLM 月開銷 < USD $200（4 人團隊規模） |
| **可維運** | 4 人團隊月維護工時 < 32 小時 |
| **合規** | 遵守 §4.3 紅線；所有產出可由人類追溯來源；公開 repo 不含原始版權素材 |
| **法律** | 所有產出物含 Disclaimer；上傳教材版權責任歸上傳者；雙 repo 隔離降低公開 repo 法律風險 |

---

## 8. 技術架構建議

### 8.1 高層架構

```
┌─────────────────┐     ┌─────────────────┐
│ Apple 公開官網   │     │ 維護者上傳教材   │
│ (apple.com 等)  │     │ (PDF/PPTX/...) │
└────────┬────────┘     └────────┬────────┘
         │ 排程爬蟲              │ 即時上傳
         ▼                       ▼
   ┌──────────────────────────────────┐
   │ Layer 1: /raw/                   │
   │ ★ PRIVATE Repo on GitHub          │
   └────────────────┬─────────────────┘
                    │
                    ▼ (Relevance Filter + Tier Check)
            ┌────────────────┐
            │ Ingest Agent   │  (Claude Sonnet 4.6)
            │ — 改寫為二創    │
            │ — 衝突偵測      │
            │ — 雙語同步      │
            │ — Diff 產生     │
            └───────┬────────┘
                    │ Git PR
                    ▼
   ┌──────────────────────────────────┐
   │ Layer 2: /wiki/                  │
   │ ★ PUBLIC Repo on GitHub           │
   │   AGENTS.md = schema             │
   │   雙語檔案並存                    │
   └────────────────┬─────────────────┘
                    │
                    ▼
   ┌──────────────────────────────────┐
   │ 前端 Web App (Next.js)            │
   │ ↓ 三大產出器（含 Disclaimer 注入） │
   │ ↓ Claude Opus 4.7 / 4.8           │
   └────────────────┬─────────────────┘
                    │
                    ▼
              使用者（講師）
```

### 8.2 推薦技術棧

| 層 | 推薦選項 | 理由 |
|---|---|---|
| 原始資料儲存 | GitHub Private Repo + Git LFS | 已決議公開託管平台是 GitHub |
| Wiki 儲存 | GitHub Public Repo (Markdown files) | 與決議一致；版本控制免費；diff 友善；社群可見 |
| LLM | Claude Sonnet 4.6 (ingest) + Opus 4.7/4.8 (產出器) | Sonnet 跑量便宜、Opus 處理創意產出 |
| 排程器 | GitHub Actions | 與託管同平台；免費額度足夠 4 人團隊 |
| 前端 | Next.js + Tailwind | 開發快、易部署 Vercel；適合靜態 + SSR 混合 |
| 認證 | Auth0 / Clerk（前端登入）；GitHub OAuth（PR 審核） | 與 GitHub 整合自然 |
| 檔案處理 | `pdf-parse`、`mammoth`(DOCX)、`pptxgenjs`(PPTX)、Apple Vision OCR | 涵蓋主要教材格式 |
| 國際化 | next-intl 或 next-i18next | Next.js 生態標準 |

### 8.3 公開 Repo 開源治理（v0.2 新增）

- **License**：
  - 程式碼（`/frontend`、`/ingest`、`sources-config.yaml`）：MIT
  - Wiki 內容（`/wiki/`）：CC BY-NC-SA 4.0（署名 - 非商業 - 相同方式分享）
  - 此組合允許他人引用我們的整理成果（NC 條款保護不被商業利用）
- **CODEOWNERS**：人工層 + AGENTS.md + DISCLAIMER.md 限定核心維護者合併
- **Branch Protection**：`main` 分支必須通過 PR + 至少 1 reviewer + 通過 CI lint
- **CI 檢查**：
  - Markdown lint
  - Frontmatter schema 驗證
  - 紅線關鍵字掃描（如「未發表」「rumor」「leak」）
  - 雙語對稱性檢查（每個 zh-TW 是否有對應 en，反之亦然）
  - Disclaimer 存在性檢查（產出物模板必須引用 DISCLAIMER.md）

---

## 9. 階段規劃

### Phase 1：MVP（Week 1-6）

**目標**：手動 ingest + 1 個產出器，驗證 Wiki Schema 設計

- [ ] Week 1：撰寫 AGENTS.md v1.0，手寫 3 個示範頁面繁中版（iPhone 17 Pro / iOS 27 / Apple Intelligence）
- [ ] Week 2：3 個示範頁面英文版 + 設計 Wiki frontmatter + 章節範本，跑通手動編輯 → Git PR 流程；建立公開 + 私有雙 repo
- [ ] Week 3：撰寫 DISCLAIMER.md v1.0、LICENSE、README、CODEOWNERS、Issue Templates
- [ ] Week 4：建前端骨架 + 「考題產生器」（先做這個，回饋最快），含雙語切換與 Disclaimer 注入
- [ ] Week 5：手動上傳功能（PDF/DOCX）+ 版權狀態勾選 UI
- [ ] Week 6：MVP 內部試用，收集回饋

### Phase 2：自動 Ingest（Week 7-12）

- [ ] Apple 官網 / Newsroom 爬蟲（繁中 + 英文）
- [ ] Relevance Filter
- [ ] LLM Ingest Agent（含二創改寫、雙語同步邏輯）
- [ ] 自動 PR 流程
- [ ] 月度 Lint 健檢
- [ ] 公開 repo 上線（前先確認 6 週內容已成熟）

### Phase 3：完整產出器（Week 13-18）

- [ ] 影片腳本產生器（Pass 1 + Pass 2）
- [ ] 銷售展示腳本產生器（FAB+P + 三長度版本）
- [ ] 段落所有權保護機制
- [ ] 衝突標記與處理流程
- [ ] 全域 Disclaimer 動態注入

### Phase 4：擴張（Week 19+）

- [ ] 加入 T2 來源（9to5Mac review/）
- [ ] 比較頁面 (`comparisons/`)
- [ ] 客戶 Persona 自訂編輯器
- [ ] WWDC「衝刺模式」最佳化
- [ ] 公開 repo 社群推廣（部落格、Apple 培訓圈分享）

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
| Phase 4 | 公開 repo Stars | > 50 |
| Phase 4 | 外部 PR/Issue 接受數 | > 10 |
| 全期 | LLM 產出物可直接使用比例（不需要大改） | ≥ 70% |
| 全期 | 紅線違反次數（PR 審核擋下） | 持續為 0 |
| 全期 | 法律糾紛 / 版權申訴 | 0 件 |

---

## 11. 風險與限制

| 風險 | 嚴重度 | 緩解 |
|---|---|---|
| **Apple 商標 / 內容版權** | 🔴 高 | 雙 repo 架構：raw 私有、wiki 公開；wiki 內容皆為 LLM 二創；DISCLAIMER 明示與 Apple 無關聯 |
| **未發表產品紅線** | 🔴 高 | 爬蟲層攔截 T4；T1 內容也須人工審核才能寫入；公開 repo 強化此責任 |
| **手動上傳教材版權糾紛** | 🟡 中 | 上傳介面強制版權狀態勾選；上傳者承擔合規責任（已寫入 §11 + DISCLAIMER）；原始檔僅進私有 repo |
| **公開 repo 內容被商業利用** | 🟡 中 | 採 CC BY-NC-SA 4.0 限制商業使用；違反者可法律追訴 |
| **LLM 幻覺** | 🟡 中 | 所有事實必須 footnote；NEEDS REVIEW 強制機制；產出物的 Disclaimer 提醒以官方為準 |
| **Apple 官網大改版** | 🟡 中 | 爬蟲解析失敗時自動降級到「等待人工」狀態 |
| **Beta 內容對外造成誤導** | 🟢 低 | Beta 標示明確 + Disclaimer 自動追加；正式版發布日強制比對 |
| **小團隊維護斷層** | 🟢 低 | AGENTS.md 是教材，新成員可自學；流程都走 PR 不依賴特定人 |
| **公開 repo 收到惡意 PR** | 🟢 低 | CODEOWNERS + Branch Protection；CI 紅線掃描自動擋 |
| **雙語不對稱導致學員混淆** | 🟢 低 | Lint 檢查 + 月度健檢；前端清楚標示「另一語尚未維護」 |

---

## 12. 已決議事項（取代 v0.1 開放問題）

| # | 主題 | 決議 | 落實章節 |
|---|---|---|---|
| Q1 | Repo 託管 | **公開 GitHub**（雙 repo：公開 wiki + 私有 raw） | §3.1, §8.2 |
| Q2 | 語系策略 | **繁體中文 + 英文 並行**；雙檔命名；事實層 LLM 同步、人工層各自獨立撰寫 | §3.3, §4.1, §5.3 |
| Q3 | 手動上傳教材版權 | **上傳者自行確認合規**；前端強制勾選版權狀態；系統不負責審核 | §5.1 F1.2, §11 |
| Q4 | 產出物法律責任 | **所有產出物含 Disclaimer**；統一管於 `wiki/DISCLAIMER.md`；前端動態注入 | §5.3 F3.4, §6, §11 |
| Q5 | Beta 內容對外 | **同意對外**；強制 `status: beta` 標示 + Beta 專屬 Disclaimer 追加 | §4.1, §5.1 F1.4 |

---

## 13. 附錄

### A. 範例 Wiki 頁面結構（產品頁，繁中版）

檔名：`products/iphone-17-pro.zh-TW.md`

```markdown
---
type: product
slug: iphone-17-pro
lang: zh-TW
siblings:
  en: products/iphone-17-pro.en.md
status: active
last_updated: 2026-06-12
source_count: 7
tags: [iphone, current, pro-line]
ingest_managed_sections: [specs, price, sources, overview]
human_owned_sections: [selling_points, signature_demos, qa, objection_handling]
---

# iPhone 17 Pro

## Overview
[LLM-managed]

## Specs
[LLM-managed: 規格表]

## Price
[LLM-managed: 各容量定價]

## Selling Points (FAB+P)
[Human-owned]
### 1. Camera Control 一鍵專業攝影
- **F**: 全新 Camera Control 硬體按鍵 (≤10 字)
- **A**: iPhone 史上首見的攝影專屬實體按鍵 (≤15 字)
- **B (學生)**: 上課即時記錄、寫報告
- **B (上班族)**: 會議白板拍攝、會議室遠距攝影
- **B (攝影愛好者)**: 從口袋掏出 3 秒進入拍攝
- **P**: [由各講師個別填入真實故事]

## Signature Demos
[Human-owned]
### Demo 1 — Camera Control 30 秒體驗
[三流格式...]

## Q&A / Objection Handling
[Human-owned]

## Sources
[^1]: https://www.apple.com/tw/iphone-17-pro/ (T1, fetched 2026-06-12)
[^2]: ...
```

英文版檔名：`products/iphone-17-pro.en.md` — frontmatter 相同但 `lang: en`、`siblings.zh-TW` 對應；事實層由 LLM 同步翻譯，人工層獨立撰寫。

### B. AGENTS.md 9 大章節大綱

1. Overall Repo Structure（含雙 repo 說明）
2. Ingest Workflow（含二創改寫、雙語同步流程）
3. Page-wide Rules
   - §3.1 Frontmatter（含 lang、siblings 雙語欄位）
   - §3.2 Content rules（含「禁止複製 T1 原文」二創規則）
   - §3.3 官方術語表 zh-TW（如「Mac」非「MAC」、「iPhone」非「Iphone」）
   - §3.3-en 官方術語表 en（如 "iPhone" not "Iphone", capitalisation rules）
   - §3.4 價格/版本/日期格式（含雙語格式）
   - §3.5 Conflict / LANG-SYNC 標記格式
4. Primary Page Template — Product（雙語檔案版）
5. Secondary Templates — OS / Concept / Comparison / SalesPlay
6. Lint Checklist（含雙語對稱性檢查）
7. Red Lines（§4.3，6 + 公開 repo 二創條款）
8. Raw Data Layer Specification
   - §8.1-8.7 同 v0.1
   - §8.8 Source Tier T1-T4
   - §8.9 URL filtering
   - §8.10 私有 Raw Repo 存取規則（v0.2 新增）
9. Version History

### C. DISCLAIMER.md v1.0 草案

```markdown
# Disclaimer / 免責聲明

## 繁體中文

本知識庫由獨立社群維護，與 Apple Inc. 無任何關聯。

本內容由 LLM 從公開資料整理產出，僅供內部培訓與教學參考使用。

- 所有事實、規格、價格以 Apple Inc. 官方公告為準。
- Apple、iPhone、iPad、Mac、Apple Watch、AirPods、Vision Pro、HomePod 等為 Apple Inc. 之商標。
- Beta 版本相關內容於正式版發布前可能變動。
- 銷售展示腳本中的個人故事（FAB+P 中的 P）需由講師/銷售人員填入真實經驗，不得使用 LLM 虛構之故事。
- 對客戶之任何規格、功能、價格承諾，請務必以 Apple 官方資訊為準；本內容造成之商業損失，由使用者自行承擔。
- 本知識庫所引用之手動上傳教材，其版權合規由上傳者自行確認；本社群與相關糾紛無涉。

## English

This knowledge base is maintained by an independent community and is not affiliated with Apple Inc.

This content is generated by LLMs from publicly available sources, intended for internal training and educational reference only.

- All facts, specifications, and prices are subject to Apple Inc.'s official announcements.
- Apple, iPhone, iPad, Mac, Apple Watch, AirPods, Vision Pro, HomePod, and other related marks are trademarks of Apple Inc.
- Beta version content is subject to change before public release.
- Personal anecdotes in sales demonstration scripts (the "P" in FAB+P) must be filled with real experiences by the trainer/salesperson; LLM-fabricated stories must not be used.
- Any commitments to customers regarding specifications, features, or prices must be verified against Apple's official information; commercial losses arising from this content are the user's sole responsibility.
- Copyright compliance of any manually uploaded training materials is the responsibility of the uploader; this community is not party to related disputes.

最後更新 / Last Updated: 2026-06-12
```

### D. README.md 草案大綱（公開 repo 門面）

```markdown
# Apple Training Wiki

> 由 LLM 共同維護的 Apple 產品知識庫，服務經銷商培訓社群。
> An LLM-maintained Apple product knowledge base for the reseller training community.

⚠️ **此知識庫與 Apple Inc. 無關聯** — 詳見 [DISCLAIMER.md](./DISCLAIMER.md)

## 用途 / Purpose
（簡述）

## 結構 / Structure
（雙 repo 說明）

## 貢獻 / Contributing
- 我們歡迎 Issue 與 PR
- 出於版權考量，不接受外部直接提交 raw/ 內容
- 三類 Issue 模板：事實錯誤、Beta 同步、術語建議

## License
- Code: MIT
- Wiki Content: CC BY-NC-SA 4.0

## 維護團隊 / Maintainers
（4 人團隊資訊）
```

---

**End of PRD v0.2**

---

**下一步建議（按優先順序）**

1. **建立兩個 GitHub Repo（公開 wiki + 私有 raw）**，先放空骨架 + LICENSE + DISCLAIMER + README
2. **手寫 3 份示範 Wiki 頁面**（iPhone 17 Pro / iOS 27 / Apple Intelligence）的繁中與英文版各一，純 Markdown — 這是壓力測試 schema 的關鍵
3. **完成 AGENTS.md v1.0**，再開始任何寫程式工作
4. 確認團隊 2-3 人對「人類審核 PR」流程沒有抗拒（這是整個系統的人類閘門）
5. 與經銷商法務或自有顧問**最終確認** Disclaimer 文案是否足以涵蓋責任分配
