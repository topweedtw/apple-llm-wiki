# ADR-004：Source Trust Levels

## 狀態

Proposed

## 日期

2026-06-10

## 背景

Apple LLM Wiki 依賴 source-backed facts。不是所有來源都應被同等看待。Apple 官方頁面、Apple 支援文件、開發者文件、零售商頁面、拆解網站、傳聞網站與社群貼文都可能有用，但它們在權威性、新鮮度、適用範圍與風險上不同。

系統需要 source trust model，讓 ingestion、review、conflict handling、ranking 與 LLM answers 能做出一致判斷。

## 決策

每個 source 都要標記 `trust_level`、`source_type`、`scope` 與 review status。

Trust level 不等於 freshness。高信任的官方頁面仍可能在目前價格上過期；較低信任的二手來源，在清楚標記時仍可用於 repairability 或 teardown details。

## Trust Levels

### `official_primary`

直接支持主張的 Apple 官方來源。

範例：

- Apple technical specifications
- Apple Newsroom announcement
- Apple Support compatibility article
- Apple Developer documentation

用於 canonical product specs、launch dates、OS support、compatibility 與官方政策。

### `official_secondary`

間接支持主張，或不是該主張 canonical page 的 Apple 官方來源。

範例：

- Apple Store pages
- Apple marketing pages
- Apple press images 或 product copy

當沒有更好的 official primary source 時使用，或作為補充證據。

### `official_archived`

Archived Apple source，原始內容由 Apple 發布，但 live URL 已不可用，或需要 archived version 來保存 historical context。

範例：

- 透過 Wayback Machine 保存的 Apple pages
- archived Apple technical specification pages
- archived Apple product pages
- archived Apple support 或 marketing pages

用於 historical facts、launch-era specifications、discontinued product information 與 original product context。不要將 archived official sources 作為 current sales status、current support status、current pricing 或 current availability 的 evidence。

### `trusted_secondary`

具有穩定編輯標準或專門資料的第三方來源。

範例：

- iFixit
- EveryMac
- MacRumors Buyer's Guide
- 可信標準組織或法規資料庫

用於 teardown details、repairability、歷史型號 metadata、購買時機或非官方分析。回答中必須清楚標記。

### `retailer_or_carrier`

零售商、電信商或經銷商來源。

用於 regional availability、pricing、bundles、promotions 或 carrier-specific variants。這類來源高度 time-sensitive。

### `community`

社群維護來源。

範例：

- forums
- wikis
- GitHub repositories
- Reddit posts

除非人工驗證，否則只作為 supporting 或 discovery evidence。

### `unknown`

尚未分類或 review 的來源。

來自 unknown sources 的 facts 預設應為 `needs_review`，不應用於 confident LLM answers。

## Source Record Fields

```yaml
id: source:apple-tech-specs-iphone-15-pro
title: iPhone 15 Pro - Technical Specifications
url: https://support.apple.com/kb/SP903
publisher: Apple
source_type: technical_specification
trust_level: official_primary
scope:
  products:
    - product:iphone-15-pro
  locales:
    - en-US
published_at: 2023-09-12
fetched_at: 2026-06-10
last_verified_at: 2026-06-10
review_status: reviewed
checksum: null
notes: null
```

## Review Status

允許值：

- `unreviewed`
- `reviewed`
- `needs_review`
- `deprecated`
- `blocked`

Review status 描述 source 是否可用。Trust level 描述來源權威性。

## Ranking Rules

當多個 facts 競爭同一答案時：

1. 優先使用 scope 更精確的來源。
2. 優先使用 `official_primary`。
3. 當 live official source 不可用或已改變時，對 historical claims 優先使用 `official_archived`。
4. 當 current-status claims 需要 live evidence 或 current verification 時，不要使用 `official_archived`。
5. 對 time-sensitive claims，優先使用較新的 verification。
6. 對 locale-specific questions，優先使用 locale-matching sources。
7. 優先使用 reviewed sources。
8. 保留較低排序的衝突來源以供 audit。

## Conflict Handling

來源不一致時，不要悄悄覆蓋 facts。

- 相同 scope 與 time range：標記 facts 為 `disputed`。
- 不同 locale 或 region：保留為不同 facts。
- 不同 time range：使用 `valid_from` 與 `valid_to`。
- 官方來源與二手來源衝突：官方來源排序較高，但有用的二手 evidence 仍保留。
- Live official source 與 archived official source 衝突：current claims 使用 live source，historical claims 使用 archived source。

## 影響

優點：

- LLM answers 可以說明來源權威性。
- Ingestion 可以更好地安排 review 優先順序。
- Conflict handling 變得一致。
- Secondary sources 仍可使用，但不會被誤認為官方主張。

成本：

- 每個 source 都需要分類。
- 某些 source 的角色可能因 claim type 而不同。
- Trust levels 需要定期 audit。

## 考慮過的替代方案

### Binary Trusted / Untrusted

不採用，因為許多來源在特定領域有用，但不是所有主張的 canonical source。

### 只使用官方來源

不採用，因為 Apple 官方來源不涵蓋所有有用細節，尤其是 teardown、historical、retailer 或 repairability data。

## 後續工作

- 定義 automated source classification rules。
- 為 unknown 與 community sources 加入 review workflow。
- 在 ADR-005 將 source ranking 納入 retrieval。
