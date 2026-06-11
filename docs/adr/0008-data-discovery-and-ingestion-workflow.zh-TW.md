# ADR-008：Data Discovery and Ingestion Workflow

## 狀態

Proposed

## 日期

2026-06-10

## 背景

前面的 ADR 已定義 knowledge architecture、entity schema、fact model、source trust levels、retrieval strategy、freshness policy 與 answer citation rules。下一個缺口是操作流程：新的 Apple 產品知識應如何被搜尋、評估、抽取、審核並加入知識庫。

如果沒有明確 ingestion workflow，系統可能把重複來源、弱 facts、無 citation claims、過期資料，或掛錯 entities 的 facts 加進知識庫。

## 決策

採用分階段的 data discovery and ingestion workflow。

任何 source 或 claim 都不應直接從搜尋結果進入 production knowledge。每筆新增資料都應經過 discovery、source registration、extraction into candidate records、entity resolution、evidence creation、validation、review 與 publication。

## Workflow Overview

1. 發現 candidate sources。
2. 登記 candidate sources。
3. 抓取並 snapshot source content。
4. 分類 source trust 與 scope。
5. 抽取 candidate entities、facts 與 evidence。
6. 解析 entities 與 aliases。
7. 依 schema rules 驗證 facts。
8. Review source 與 fact quality。
9. 發布 accepted facts 與 pages。
10. 排程 freshness checks。

## Source Discovery

Source discovery 應盡可能從 Apple 官方來源開始。

優先搜尋順序：

1. Apple official technical specifications
2. Apple Newsroom
3. Apple Support
4. Apple Developer documentation
5. Apple Store and archived Apple pages
6. Trusted secondary sources
7. Retailer、carrier、regulatory 或 repair sources
8. Community sources 僅作 discovery

Search queries 應包含 product names、model identifiers、Apple support identifiers、event names 與 known aliases。

範例 discovery query set：

```yaml
entity: product:iphone-15-pro
queries:
  - site:apple.com iPhone 15 Pro technical specifications
  - site:support.apple.com iPhone 15 Pro specs
  - site:apple.com/newsroom iPhone 15 Pro announcement
  - iPhone15,2 Apple
  - A3101 iPhone 15 Pro
```

## Candidate Source Queue

Discovered sources 應先進入 candidate queue，再進行 ingestion。

```yaml
candidate_source:
  url: https://support.apple.com/kb/SP903
  discovered_for:
    - product:iphone-15-pro
  discovery_method: web_search
  discovered_at: 2026-06-10
  expected_source_type: technical_specification
  status: pending_fetch
```

Queue 可避免重複 crawling，並保留「為何考慮這個 source」的 audit trail。

## Fetch and Snapshot

Candidate source 被接受進行 ingestion 後，系統應抓取並 snapshot 其內容。

Snapshot 應保存：

- URL
- title
- publisher
- fetched timestamp
- locale
- content checksum
- normalized text
- relevant HTML 或 document structure
- retrieval errors, if any

Snapshots 讓後續 fact review 與 freshness comparison 成為可能。

## Source Classification

抓取後，依 ADR-004 分類 source。

必要 classification fields：

- `source_type`
- `trust_level`
- `scope`
- `locale`
- `review_status`

未分類 sources 的預設值為：
- `trust_level`: `unknown`
- `review_status`: `needs_review`

## Extraction

Extraction 應產生 candidate records，而不是 production facts。

Candidate extraction outputs：

- candidate entities
- candidate aliases
- 存在 `candidate_facts` 的 candidate facts
- evidence records
- source sections
- extraction confidence
- unresolved references
- issues，描述 missing evidence、unresolved entities、unnormalized units 或 schema problems

允許 LLM-assisted extraction，但它只能產生 candidate facts。沒有 evidence 的 candidate fact 可以留在 `candidate_facts` 並標記 `review_status: needs_review`，或被 rejected；不得 promoted into production `facts` table。

## Entity Resolution

Facts 被接受前，系統必須將 subjects 與 objects 解析為 canonical entity IDs。

Resolution 應使用：

- exact entity IDs
- canonical names
- aliases
- model numbers
- Apple identifiers
- generation relationships
- source context

如果 resolution 有歧義，candidate fact 應留在 review，不得 publish。

## Validation

Validation 分為兩階段：candidate intake validation 與 promotion validation。

Candidate intake validation 檢查 candidate record 是否可進入 review。當缺漏或不合法項目已明確記錄在 `issues` 時，可以允許不完整 records 留在 review。

Candidate intake checks：

- required fields exist
- predicate is allowed or proposed
- value type matches predicate
- unit 已依 unit registry normalized，或已記錄 `unnormalized_unit` issue
- normalized `value` 存在，或已記錄 missing-normalization issue
- 來源文字透過 evidence、`raw_value` 或 source snapshot context 保留
- source refs point to existing evidence，或已記錄 `missing_evidence` issue
- subject and object entities exist，或已記錄 unresolved entity issues
- locale and time qualifiers are valid
- extraction confidence is set
- candidate `issues` 描述 missing evidence、unresolved entities、unnormalized units 或 schema problems

Promotion validation 檢查 candidate fact 是否可成為 production fact。

Promotion checks：

- all production fact required fields exist
- predicate is allowed
- value type matches predicate
- 需要 unit 時，unit 是 active registry unit
- `value` 已依 predicate 與 `value_type` normalized
- `raw_value` 即使存在，也不能取代 evidence
- source refs point to existing evidence
- subject and object entities exist
- locale and time qualifiers are valid
- freshness and confidence are set
- candidate `issues` 已 resolved、accepted as non-blocking，或 explicitly rejected

Validation failure 應阻擋 publication。

## Review

Review 應回答以下問題：

- Source 是否適合支持這個 claim？
- Entity resolution 是否正確？
- Evidence 是否支持 fact？
- Value 是否 normalized correctly？
- Claim 是否 time-sensitive 或 locale-specific？
- 是否與 existing facts 衝突？
- Candidate fact 應 promoted to production、revise、reject，還是保留在 review？

## Publication

發布 accepted data 時應：

- create or update source records
- create or update entities
- promote accepted candidate facts into production facts
- attach evidence records
- update wiki pages or page queues
- update indexes
- schedule freshness checks

Publication 應可 audit，並可透過 version history 回復。

## Re-ingestion

以下情況應重新 ingest existing sources：

- source checksum changes
- freshness TTL expires
- Apple announces related products
- conflicts are detected
- user asks a current-status question
- manual review requests it

Re-ingestion 應產生 diffs，而不是 destructive overwrites。

## 影響

優點：

- 避免 raw search results 直接變成 unsupported facts。
- 從一開始就保留 evidence。
- 讓 ingestion 可 audit。
- 支援安全使用 LLM-assisted extraction。
- 改善 entity consistency 與 citation quality。

成本：

- 資料可用前需要更多 workflow steps。
- 需要 queues、validation 與 review tooling。
- 有些有用 candidate data 可能在 review 前維持 pending。

## 考慮過的替代方案

### Direct Search-to-Fact Import

不採用，因為它會讓弱、重複或無 citation claims 進入知識庫。

### Manual Curation Only

不採用，因為 Apple 產品知識量大且經常變動。Manual review 是必要的，但 discovery 與 extraction 應該被輔助。

### Fully Automated Ingestion

不採用，因為 entity resolution、source trust、conflicts 與 citation quality 都需要 review 才能維持高可靠性。

## 後續工作

- 定義 ingestion queue schema。
- 定義 source snapshot storage。
- 定義 extraction prompts and parsers。
- 定義 review UI and approval states。
- 定義 re-ingestion diff format。
