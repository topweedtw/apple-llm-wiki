# ADR-009：Historical Product Ingestion Policy

## 狀態

Proposed

## 日期

2026-06-10

## 背景

Apple 目前的商店頁面通常只聚焦於仍在銷售的產品。完整的 Apple LLM Wiki 必須包含歷史與已停產產品，因為許多有用問題會涉及舊 iPhone、iPad、Mac、Apple Watch、AirPods、配件、作業系統、晶片與支援狀態。

Historical product data 不能只依賴目前的 Apple Store pages。它需要獨立的 ingestion policy，明確區分 original historical facts 與 current status facts。

## 決策

對舊產品或已停產 Apple 產品，使用 dedicated historical ingestion path。

Historical products 應優先從官方歷史來源加入，其次使用 archived official sources，當官方資料缺失或不完整時再使用 trusted secondary sources。歷史規格應標記為 `historical`。目前支援、維修、銷售與軟體狀態則應建模為獨立的 current 或 freshness-sensitive facts。

## Source Priority

Historical products 使用以下來源順序：

1. Apple official technical specification pages
2. Apple Support model identification pages
3. Apple Newsroom launch announcements
4. Apple Developer documentation
5. Apple event videos or transcripts
6. Apple archived pages 或 web archives 中的官方頁面
7. Trusted secondary sources，例如 EveryMac、iFixit、MacRumors Buyer's Guide
8. Retailer、carrier、regulatory 或 repair sources
9. Community sources 僅作 discovery

當來源是 archived，但原始內容來自 Apple，應和 live official pages 分開標記。

範例：

```yaml
trust_level: official_archived
source_type: archived_official_page
freshness: historical
```

## Historical Facts vs Current Status Facts

不要混合原始產品歷史與目前狀態。

Historical facts 描述產品發表時或生命週期中曾經為真的內容：

- announcement date
- original release date
- original price
- original specifications
- included chip
- launch operating system
- model identifiers
- product generation
- original compatibility

Current status facts 描述現在為真的狀態：

- current sales status
- vintage or obsolete status
- repair availability
- latest supported operating system
- security update eligibility
- current accessory or service compatibility

Historical fact 範例：

```yaml
id: fact:iphone-6:release-date
subject: product:iphone-6
predicate: has_release_date
value: 2014-09-19
value_type: date
freshness: historical
```

Current status fact 範例：

```yaml
id: fact:iphone-6:support-status
subject: product:iphone-6
predicate: has_support_status
value: obsolete
value_type: enum
freshness: current
last_verified_at: 2026-06-10
```

## Entity Creation for Historical Products

Historical products 應使用 ADR-002 定義的同一套 entity schema。

最小必要欄位：

- `id`
- `type`
- `canonical_name`
- `status`
- `aliases`
- `first_seen_at`
- `source_ids`

對身份穩定的已停產產品使用 `status: historical`。

範例：

```yaml
id: product:iphone-6
type: Product
canonical_name: iPhone 6
status: historical
aliases:
  - iPhone 6
external_ids:
  model_numbers:
    - A1549
    - A1586
    - A1589
first_seen_at: 2014-09-09
source_ids:
  - source:apple-newsroom-iphone-6
```

## Archived Official Sources

當 Apple 不再託管原始頁面，或 live page 已改變時，archived official sources 很有用。

規則：

- 已知時保留 original URL。
- 另行記錄 archive URL。
- 記錄 archive timestamp。
- 將 source 標記為 `official_archived`，而不是 `official_primary`。
- Archived evidence 用於 historical facts，不用於 current status facts。
- 回答目前支援問題時，優先使用 live Apple Support pages。

範例：

```yaml
source:
  id: source:apple-archived-iphone-6-tech-specs
  original_url: https://www.apple.com/iphone-6/specs/
  archive_url: https://web.archive.org/...
  publisher: Apple
  trust_level: official_archived
  source_type: archived_official_page
  fetched_at: 2026-06-10
```

## Trusted Secondary Sources

當官方來源缺失、不完整或難以解析時，可以使用 trusted secondary sources。

建議用途：

- EveryMac：historical Mac identifiers and specs
- iFixit：teardown、repairability、internal components
- MacRumors Buyer's Guide：lifecycle 與 buyer timing context
- regulatory databases：model and wireless details

Secondary-source facts 必須標記，不應覆蓋 direct official evidence，除非官方來源不存在或不明確。

## Unknown or Missing Data

不要創造缺失的歷史細節。

如果 value unknown：

- 不建立 production fact，或
- 只有在 review workflow 有用時建立 explicit `unknown` candidate fact，並且
- 留在 `candidate_facts`，使用 candidate state `needs_review`，並記錄 explicit issues。

範例：

```yaml
id: candidate-fact:old-product:original-price:unknown
predicate: has_original_price
value: unknown
state: needs_review
issues:
  - missing_value
```

## Review Rules

Historical ingestion review 必須檢查：

- product identity 是否正確
- model identifiers 是否對應正確 region 或 variant
- facts 描述的是 original state 還是 current state
- archived evidence 是否來自 Apple 官方來源
- secondary sources 是否與 official evidence 衝突
- locale-specific facts 是否正確 scoped

## Answer Behavior

回答舊產品問題時：

- 對原始規格與發表歷史使用 `historical` facts。
- 對支援、維修、availability 與 OS status 使用 `current` facts。
- Current status facts 為 `possibly_stale` 時要提醒。
- 清楚標記 secondary-source claims。
- 不要假設 discontinued 就等於 obsolete 或 unsupported。

## 影響

優點：

- 舊產品可以被表示，不依賴目前 Apple Store pages。
- 原始產品歷史與目前支援狀態被分開。
- Archived Apple sources 可保留價值，同時清楚標記。
- Trusted secondary sources 可以補缺口，但不會和官方主張混在一起。

成本：

- Historical ingestion 需要更多 source discovery。
- Archived sources 需要額外 metadata。
- 有些舊產品在 review 前可能維持部分不完整。

## 考慮過的替代方案

### 只收錄目前銷售產品

不採用，因為這會讓 wiki 對歷史比較、維修、二手交易與支援問題都不完整。

### 將 Archived Apple Pages 當成 Current Official Sources

不採用，因為 archived pages 對歷史很有用，但不應作為目前狀態 evidence。

### 將 Secondary Sources 作為 Canonical History

不採用，因為 secondary sources 有價值，但不應優先於 direct official evidence。

## 後續工作

- 定義 archive source metadata fields。
- 建立 historical product discovery query templates。
- 建立 old product ingestion review checklist。
