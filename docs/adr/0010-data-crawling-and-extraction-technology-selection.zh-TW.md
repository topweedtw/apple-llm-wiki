# ADR-010：Data Crawling and Extraction Technology Selection

## 狀態

Accepted

## 日期

2026-06-10

## 背景

ADR-008 定義 discovery and ingestion workflow。ADR-009 定義 historical product ingestion policy。下一個決策是實作這些 workflows 時，應採用哪些 crawling、parsing、extraction、storage 與 indexing technologies。

Apple LLM Wiki 會 ingest 多種 source types：

- static Apple technical specification pages
- Apple Support articles
- Apple Newsroom pages
- Apple Store pages
- Apple Developer documentation
- archived Apple pages
- trusted secondary sources
- retailer、carrier、regulatory 與 repair sources

技術選型應讓系統可靠、可 audit，並容易演進。當 static fetching 足夠時，不應使用昂貴的 browser automation；當 deterministic parsing 足夠可靠時，也不應優先使用 LLM extraction。

## 決策

採用分層 crawling and extraction stack：

1. HTTP fetch 優先。
2. Browser automation 只作 fallback。
3. Deterministic parsers 優先於 LLM-assisted extraction。
4. 每個 fetched source 都要 snapshot。
5. 使用 queue-based ingestion。
6. 以 Postgres 作為初始 system of record。
7. 初期使用 Postgres full-text search 與 pgvector。
8. 只有在 scale 或 workflow complexity 需要時，才加入 OpenSearch、Temporal 或 graph databases。

ADR-017 選定 TypeScript on Node.js 作為初始 runtime。因此 initial implementation 應使用本 ADR 中列出的 Node.js tools。Python tools 保留為 future alternatives，可用於 specialized workers 或後續 runtime decision；它們不屬於第一條 vertical slice。

## Fetching Strategy

### Static Pages

對 static 或 mostly static pages 使用 HTTP fetching。

建議工具：

- Python: `httpx`, `requests`
- Node.js: `undici`, built-in `fetch`

依 ADR-017 的初始 runtime，使用 `undici` 或 built-in `fetch`。

適用於：

- Apple technical specifications
- Apple Support articles
- Apple Newsroom pages
- Apple Developer documentation
- render static HTML 的 trusted secondary source pages

### Dynamic Pages

只有當 HTTP fetch 無法取得需要內容時，才使用 Playwright。

適用於：

- JavaScript-rendered Apple Store pages
- 重要內容在 load 後才 hydrate 的頁面
- 需要 browser behavior 才能顯示內容的頁面
- debugging extraction failures

規則：

```text
Try HTTP fetch first. Escalate to Playwright only when the static snapshot is insufficient.
```

## Archived Sources

對 archived official pages 使用 Wayback Machine CDX API 或等效 archive APIs。

同時保存 original 與 archive metadata：

```yaml
original_url: https://www.apple.com/iphone-6/specs/
archive_url: https://web.archive.org/...
archive_timestamp: 20140919T000000Z
fetched_at: 2026-06-10
checksum: null
```

Archived official sources 應遵守 ADR-009，不應被當成 current-status evidence。

## Snapshot Storage

每個 fetched source 都應產生 snapshot。

Snapshot 內容：

- raw HTML 或 source document
- normalized text
- extracted metadata
- fetch timestamp
- HTTP status
- content checksum
- locale
- parser version
- fetcher type: `http` or `browser`

初始 storage：

- 第一條 vertical slice 把 raw content 與 normalized text 直接存進 Postgres 的
  `source_snapshots` 表，與 snapshot metadata 放在一起。單一儲存讓 snapshots
  與 ingestion records 保持 transactional，也容易作為 test fixtures 載入。
- 當 snapshot volume 或大小讓 Postgres 儲存不再實際時，把 raw content 改放
  local filesystem 或 object storage，以 checksum 為 key。無論哪種情況，
  snapshot metadata 都留在 Postgres 供 lookup 與 audit。

## Parsing Strategy

先用 deterministic parsing，再使用 LLM extraction。

建議工具：

- Python: `BeautifulSoup`, `lxml`, `trafilatura`
- Node.js: `cheerio`, `linkedom`

依 ADR-017 的初始 runtime，優先使用 `cheerio`。需要 DOM-like parsing 時可使用 `linkedom`。Python parsing tools 是 alternatives，不是 initial dependencies。

Deterministic parsers 適合：

- specification tables
- headings and sections
- structured support articles
- known Apple page templates
- model number tables

Parser output 應是 candidate facts、candidate entities 與 evidence anchors。

## LLM-Assisted Extraction

只有 deterministic parsing 不足時，才使用 LLM extraction。

適合場景：

- Newsroom prose
- event summaries
- compatibility explanations
- wording 複雜的 support documents
- evidence-anchor suggestions

規則：

- LLM extraction 產生 candidates，不是 production facts。
- Extracted candidate facts 應在可取得時包含 evidence。
- Missing evidence 必須在 review 前記錄為 blocking candidate issue。
- Production facts 在 promotion 前必須包含 evidence。
- LLM output 在 review 前必須通過 candidate intake validation，publication 前必須通過 promotion validation。
- Low-confidence extraction 必須留在 `candidate_facts`，並標記 `review_status: needs_review`。

## Queue and Workflow

Crawling 與 ingestion 應透過 job queue 執行。

初期可接受選項：

- simple Postgres-backed job table
- Node.js implementation 使用 BullMQ with Redis
- Python implementation 使用 Celery、RQ 或 Dramatiq

第一條 vertical slice 使用 ADR-017 選定的 simple Postgres-backed job table。BullMQ、Redis、Celery、RQ、Dramatiq 與 Temporal 保留為 upgrade paths。

只有當 workflows 需要 long-running retries、human approval steps 與 complex orchestration 時，才升級到 Temporal。

## Storage and Indexing

初始 system of record：

- Postgres 用於 sources、entities、production facts、candidate facts、evidence、reviews 與 job state

初始 search：

- Postgres full-text search 用於 keyword search
- pgvector 用於 semantic search
- relational tables 用於 graph traversal

升級路徑：

- 當 keyword search、faceting 或 ranking 超過 Postgres 能力時加入 OpenSearch
- 當 pgvector 不足時加入 dedicated vector database
- 當 relationship traversal 複雜且有 performance limit 時加入 graph database

## Rate Limits and Politeness

Crawler 應：

- 在適用時尊重 robots.txt
- 使用保守 concurrency
- retry with backoff
- 使用清楚 user agent
- 避免 scraping user-specific 或 authenticated content
- 保存 errors，而不是無限 retry

## Validation Gates

Publication 前，crawled and extracted data 必須通過：

- source classification
- snapshot creation
- entity resolution
- candidate issue validation
- fact schema validation
- evidence validation
- freshness assignment
- review approval when required

## 影響

優點：

- Static fetching 讓 ingestion 快且簡單。
- Browser automation 保留為可用 fallback，但不成為預設。
- Parser-first extraction 提高可靠性。
- LLM-assisted extraction 可處理 messy prose，同時保持可 review。
- Postgres-first storage 讓初始系統更簡單。

成本：

- 多種 extraction paths 需要清楚 routing。
- Page template changes 需要 parser maintenance。
- 有些 dynamic pages 仍可能需要 Playwright。
- Publication 前仍需要 review tooling。

## 考慮過的替代方案

### 全部使用 Playwright

不採用，因為它較慢、成本較高、較難 scale，而且許多 static Apple pages 不需要。

### 全部使用 LLM Extraction

不採用，因為對 specification tables 與 known templates，deterministic structured parsing 更可靠也更容易 validate。

### 一開始就使用 OpenSearch 與 Graph Database

不採用，因為初始系統可以先用 Postgres、full-text search、pgvector 與 relational graph tables 保持簡單。

## 後續工作

- 定義 source fetcher interfaces。
- 定義 parser output schema。
- 定義 extraction prompt templates。
- 定義 snapshot storage layout。
- 定義 job queue schema。
- 定義 OpenSearch、Temporal 與 graph databases 的升級條件。
