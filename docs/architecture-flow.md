# Architecture Flow

This document shows how the Apple Training Wiki works today: how data enters,
how it is curated, and how it is turned into teaching materials. It reflects the
Markdown LLM-Wiki architecture ([ADR-023](adr/0023-architecture-re-anchoring-markdown-llm-wiki.md)),
the Cloudflare-first stack ([ADR-024](adr/0024-technology-stack-re-selection-cloudflare-first.md)),
PRD v0.3, and the wiki schema in [`/AGENTS.md`](../AGENTS.md).

Traditional Chinese: [architecture-flow.zh-TW.md](architecture-flow.zh-TW.md)

---

## 1. Development / System Flow (technical view)

How components collaborate from source to user, and where each runs.

```mermaid
flowchart TD
    subgraph SRC["Sources"]
        A1["Apple official sites<br/>apple.com / support / newsroom / developer"]
        A2["Maintainer uploads<br/>PDF / PPTX / DOCX"]
    end

    subgraph GHA["GitHub Actions (all heavy work)"]
        B1["Scheduled crawl (weekly)<br/>HTTP → Playwright fallback"]
        B2["Relevance gate + tier check<br/>T4 blocked"]
        B3["LLM ingest agent<br/>rewrite (original wording) · bilingual · footnotes"]
        B4["Open PR via Octokit"]
    end

    subgraph REPO["Single private GitHub repo"]
        C1["raw/ (LLM read-only)"]
        C2["wiki/ (canonical, LLM writes)"]
        C3["AGENTS.md (schema)"]
    end

    REV{"Human PR review<br/>GitHub web + CI lint"}

    subgraph CF["Cloudflare"]
        D1["Hono API (Workers)<br/>reads wiki + calls LLM<br/>(Vercel AI SDK / AI Gateway)"]
        D2["Vite+React SPA (Pages)<br/>Auth0 login"]
    end

    U["Trainer (user)"]

    A1 --> B1 --> C1
    A2 --> C1
    C1 --> B2 --> B3 --> B4 --> REV
    C3 -. rules .-> B3
    REV -->|merge| C2
    REV -->|reject / NEEDS REVIEW| B3
    C2 --> D1 --> D2 --> U
    U -->|generation request| D2
```

Key points:

- The LLM can only write into the wiki through a **pull request reviewed and
  merged by a human**. It never commits to the default branch.
- All heavy work (crawl, parse, OCR, LLM rewrite) runs in **GitHub Actions**.
  Cloudflare only runs the real-time API and the front end.
- `AGENTS.md` constrains the ingest agent's behavior.

---

## 2. User-View Data Journey (in → curated → out)

The same flow from a trainer/maintainer's perspective: where wiki data comes
from, how it is curated, and how it becomes teaching material.

```mermaid
flowchart TD
    subgraph S1["1. Where data comes from"]
        I1["Automated crawl of Apple sites"]
        I2["Manual upload<br/>(copyright status required)"]
        RAW["raw/ original materials<br/>private only, never published"]
    end

    subgraph S2["2. How it is curated"]
        F1["Relevance gate<br/>T1 pass / T2 scored / T4 blocked"]
        F2["LLM rewrite (original wording)<br/>never copy source prose"]
        F3["Bilingual sync + per-claim footnotes"]
        F4{"Human PR review"}
        WIKI["wiki/ canonical knowledge<br/>single source of truth"]
    end

    subgraph S3["3. How it is exported"]
        O1["Trainer picks<br/>type / topic / language / params"]
        O2["API reads wiki + LLM generates"]
        O3["Question bank / video / sales script<br/>with citations + disclaimer"]
    end

    I1 --> RAW
    I2 --> RAW
    RAW --> F1 --> F2 --> F3 --> F4
    F4 -->|approve & merge| WIKI
    F4 -->|reject / mark NEEDS REVIEW·CONFLICT| F2
    WIKI --> O1 --> O2 --> O3
```

Key points:

- Original source material always stays in `raw/` (private). The wiki holds only
  rewritten, human-approved canonical knowledge.
- Every factual claim carries a footnote, so each output can be traced back to
  its source.
- Every export automatically includes the disclaimer from `wiki/DISCLAIMER.md`.

---

## 3. Key Invariants

These hold throughout the flow:

- Knowledge enters the wiki only via human-reviewed pull requests.
- `raw/` is LLM read-only; the LLM never edits it.
- The wiki is the single source of truth (Git Markdown); there is no separate
  database of record.
- T4 sources (leaks, rumors) are blocked at the crawl layer.
- Uncertain or conflicting content is marked `NEEDS REVIEW` / `CONFLICT` and
  routed to a human, never silently published.
- Heavy work runs in GitHub Actions; Cloudflare runs only the API and SPA.

---

## 4. Component Responsibilities

| Component | Where it runs | Responsibility |
| --- | --- | --- |
| Scheduled crawl + ingest agent | GitHub Actions | fetch, parse, OCR, relevance/tier check, LLM rewrite, open PR |
| Single private repo | GitHub | `raw/`, `wiki/`, `AGENTS.md`, `docs/`, `apps/`, config |
| Human maintainers | GitHub web | review and merge PRs |
| Hono API | Cloudflare Workers | read wiki, generators, extraction, LLM calls, auth verification |
| Front-end SPA | Cloudflare Pages | browse, generator UI, upload, Auth0 login |
| LLM | via Vercel AI SDK / Cloudflare AI Gateway | ingest rewrite + output generation (switchable provider) |
