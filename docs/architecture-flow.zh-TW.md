# Architecture Flow（架構流程）

本文件說明 Apple Training Wiki 目前的運作方式：資料怎麼進來、怎麼被整理、最後怎麼
變成教學素材。內容對齊 Markdown LLM-Wiki 架構
（[ADR-023](adr/0023-architecture-re-anchoring-markdown-llm-wiki.zh-TW.md)）、
Cloudflare-first 技術棧
（[ADR-024](adr/0024-technology-stack-re-selection-cloudflare-first.zh-TW.md)）、
PRD v0.3，以及 repo 根的 wiki schema [`/AGENTS.md`](../AGENTS.md)。

English: [architecture-flow.md](architecture-flow.md)

---

## 1. 開發 / 系統運作流程（技術視角）

從來源到使用者，各元件怎麼協作、誰在哪裡執行。

```mermaid
flowchart TD
    subgraph SRC["來源"]
        A1["Apple 官網<br/>apple.com / support / newsroom / developer"]
        A2["維護者上傳教材<br/>PDF / PPTX / DOCX"]
    end

    subgraph GHA["GitHub Actions（重活都在這）"]
        B1["排程爬蟲（每週一）<br/>HTTP → Playwright 後備"]
        B2["相關性過濾 + Tier 檢查<br/>T4 攔截"]
        B3["LLM Ingest Agent<br/>二創改寫 · 雙語 · footnote"]
        B4["Octokit 開 PR"]
    end

    subgraph REPO["單一私有 GitHub Repo"]
        C1["raw/（LLM 只讀）"]
        C2["wiki/（canonical，LLM 寫）"]
        C3["AGENTS.md（schema）"]
    end

    REV{"人類審核 PR<br/>GitHub Web + CI lint"}

    subgraph CF["Cloudflare"]
        D1["Hono API（Workers）<br/>讀 wiki + 呼叫 LLM<br/>（Vercel AI SDK / AI Gateway）"]
        D2["前端 Vite+React SPA（Pages）<br/>Auth0 登入"]
    end

    U["講師（使用者）"]

    A1 --> B1 --> C1
    A2 --> C1
    C1 --> B2 --> B3 --> B4 --> REV
    C3 -. 規則約束 .-> B3
    REV -->|merge| C2
    REV -->|退回 / NEEDS REVIEW| B3
    C2 --> D1 --> D2 --> U
    U -->|產出請求| D2
```

重點：

- LLM 只能透過 **PR + 人類審核**寫進 wiki，不會直接 commit 到主分支。
- 重活（爬蟲、解析、OCR、LLM 改寫）都在 **GitHub Actions**；Cloudflare 只跑即時
  API 與前端。
- `AGENTS.md` 約束 ingest agent 的行為。

---

## 2. 使用者視角的資料旅程（來 → 整理 → 輸出）

同一條流程，從講師/維護者角度看：wiki 裡的資料怎麼來、怎麼被整理、最後怎麼變成教材。

```mermaid
flowchart TD
    subgraph S1["① 資料怎麼來"]
        I1["自動爬取 Apple 官網"]
        I2["手動上傳教材<br/>（必填版權狀態勾選）"]
        RAW["raw/ 原始素材<br/>只存私有、不對外"]
    end

    subgraph S2["② 怎麼被整理"]
        F1["相關性過濾<br/>T1 直通 / T2 評分 / T4 禁止"]
        F2["LLM 二創改寫<br/>不複製原文"]
        F3["雙語同步 + 每個事實附 footnote 出處"]
        F4{"人類審核 PR"}
        WIKI["wiki/ canonical 知識<br/>單一事實來源 (SSoT)"]
    end

    subgraph S3["③ 怎麼輸出"]
        O1["講師在前端選<br/>類型 / 主題 / 語系 / 參數"]
        O2["API 讀 wiki + LLM 生成"]
        O3["考題 / 影片腳本 / 銷售腳本<br/>含出處連結 + Disclaimer"]
    end

    I1 --> RAW
    I2 --> RAW
    RAW --> F1 --> F2 --> F3 --> F4
    F4 -->|核准 merge| WIKI
    F4 -->|退回 / 標 NEEDS REVIEW·CONFLICT| F2
    WIKI --> O1 --> O2 --> O3
```

重點：

- 原始素材永遠留在 `raw/`（私有）；wiki 只放二創後、經人類核准的 canonical 知識。
- 每筆事實主張都附 footnote，因此每個輸出都能沿出處追回來源。
- 每個輸出自動帶上 `wiki/DISCLAIMER.md` 的免責聲明。

---

## 3. 關鍵不變量

整條流程都遵守：

- 知識只能透過人類審核的 pull request 進入 wiki。
- `raw/` 對 LLM 唯讀；LLM 不編輯它。
- wiki 是單一事實來源（Git Markdown）；沒有另一個資料庫真相來源。
- T4 來源（爆料、傳聞）在爬蟲層被攔截。
- 存疑或衝突內容標 `NEEDS REVIEW` / `CONFLICT` 交人類，不會悄悄發布。
- 重活在 GitHub Actions；Cloudflare 只跑 API 與 SPA。

---

## 4. 元件職責對照

| 元件 | 在哪執行 | 職責 |
| --- | --- | --- |
| 排程爬蟲 + ingest agent | GitHub Actions | 抓取、解析、OCR、相關性/tier 檢查、LLM 改寫、開 PR |
| 單一私有 repo | GitHub | `raw/`、`wiki/`、`AGENTS.md`、`docs/`、`apps/`、設定 |
| 人類維護者 | GitHub Web | 審核並合併 PR |
| Hono API | Cloudflare Workers | 讀 wiki、產出器、提取、LLM 呼叫、認證驗證 |
| 前端 SPA | Cloudflare Pages | 瀏覽、產出工具 UI、上傳、Auth0 登入 |
| LLM | 經 Vercel AI SDK / Cloudflare AI Gateway | ingest 改寫 + 輸出生成（provider 可切換） |
