# ADR-018：Entity Resolution Rules

## 狀態

Accepted

## 日期

2026-06-11

## 背景

ADR-002 定義 canonical entities 與 aliases。ADR-008 要求 candidate facts 發布前必須完成 entity resolution。ADR-011 要求 promotion 前必須通過 entity resolution validation。

目前缺少的決策是：extracted names、aliases、model numbers、marketing names 與 source context 應如何解析到 canonical entity IDs。

這很重要，因為 Apple 命名常常有歧義：

- "iPad Pro" 可能指許多 generations 與 sizes。
- "MacBook Pro" 可能指 product line、generation 或 specific product。
- "Apple TV" 可能指 hardware、app、service 或 product line。
- model numbers 可能是 region-specific。
- source pages 通常有足夠 context 可以消歧，但 snippets 不一定有。

錯誤的 automatic resolution 會把 facts 掛到錯誤產品。Ambiguous resolution 必須留在 candidate records 與 review queues。

## 決策

使用 deterministic、scored entity resolution pipeline，並採 conservative auto-resolution thresholds。

Entity resolution 必須產生：

- candidate entity ID
- entity type
- `0.0` 到 `1.0` 的 score
- match method
- match evidence
- 多個候選合理時的 ambiguity set
- decision：`auto_resolved`、`needs_review` 或 `unresolved`

Production promotion 要求 fact subject 完成 final entity resolution；當 predicate 需要 entity target 時，object 也必須完成 final entity resolution。

## Resolution Inputs

Entity resolution 可使用：

- canonical entity IDs
- canonical names
- aliases
- model numbers
- Apple identifiers
- source URL 與 Apple support identifiers
- page title
- source scope
- surrounding headings and sections
- extracted generation names
- announcement、release 或 publication date 等日期
- product line context
- locale 與 region
- existing relationships and facts

Raw LLM guesses 不得作為 final resolution。LLM output 可以提出 candidates，但仍必須經過 deterministic scoring 與 review rules。

## Match Priority

使用以下 priority order：

1. exact canonical entity ID match
2. exact external ID match，例如 Apple support ID 或 model number
3. explicit source scope 中的 exact canonical name match
4. explicit source scope 中的 exact alias match
5. URL、page title 與 source metadata match
6. generation 或 product line context match
7. fuzzy text match
8. LLM-suggested candidate

即使是 higher-priority match，只要名稱有歧義或 source scope 與 candidate 衝突，仍可能需要 review。

## Scoring

Resolution scores 使用以下 default bands：

- `1.00`：exact canonical entity ID 或 unique external ID match
- `0.95`：exact canonical name 或 alias，且有 strong source-scope confirmation
- `0.90`：exact name 加 strong generation、date 或 URL context
- `0.80`：exact name 但 context weak，或 fuzzy name 加 strong context
- `0.70`：plausible fuzzy match with partial context
- 低於 `0.70`：unresolved

Implementation 可以計算更細的 weighted score，但必須映射到這些 bands 以供 review decisions 使用。

建議 signal weights：

- exact canonical ID：hard match
- unique model number 或 Apple identifier：hard match
- source scope match：high
- page title match：high
- exact alias：medium to high
- generation/date context：medium
- product line context：medium
- fuzzy name similarity：low to medium
- LLM suggestion：supporting signal only

## Auto-Resolution Rules

只有在以下條件全部成立時，才允許 auto-resolution：

- score `>= 0.95`
- top candidate 至少比 next candidate 高 `0.10`
- source scope 不與 candidate 衝突
- entity type 符合 ADR-021 定義的 predicate role
- 沒有 existing fact 或 relationship 造成 same-scope contradiction
- match method 不是 LLM-only

Auto-resolution 必須記錄支持該 decision 的 signals。

## Review Rules

以下情況 resolution 必須標記 `needs_review`：

- score `>= 0.70` 且 `< 0.95`
- top two candidates 差距小於 `0.10`
- extracted name 在多個 generations 重複使用
- candidate type plausible 但不確定
- source scope missing 或 weak
- model numbers 是 region-specific，且 fact 是 locale-sensitive
- LLM suggestion 是主要 signal
- source context 與原本 strong match 衝突

以下情況 resolution 必須標記 `unresolved`：

- score 低於 `0.70`
- 沒有 candidate entity
- 缺少必要 disambiguating context
- candidate 看起來是 new entity，必須先建立 entity

## Ambiguous Product Names

Ambiguous product-family names 不得在沒有 source context 的情況下解析成 specific product。

範例：

- "iPad Pro" alone 應 resolve 到 `product-line:ipad-pro`，或依是否存在 product-line entity 而保持 ambiguous。
- "iPad Pro M4" 在 source scope 與 release context 支持時，可 resolve 到 `product-generation:ipad-pro-m4`。
- "11-inch iPad Pro (M4)" 可依 entity model resolve 到 specific product 或 generation。
- "MacBook Pro" alone 不應 resolve 到 specific yearly model。

如果 predicate 需要 specific product，但 extracted name 只能 resolve 到 product line 或 generation，candidate fact 必須留在 review，或改寫成正確 scope。

## Locale and Region

Locale 與 region 可用於消歧 model numbers、availability、pricing、cellular bands 與 bundled accessories。

Rules：

- region-specific model numbers 在 variant entity 存在時，應優先 resolve 到 variant entities
- locale-specific claims 不應強制建立 separate product entity，除非 ADR-002 identity rules 要求
- 如果 source locale 與 candidate entity scope 衝突，resolution 應標記 `needs_review`

## Candidate Record Fields

Candidate facts 應保存 resolution metadata：

```yaml
entity_resolution:
  subject:
    extracted_name: iPad Pro
    candidate_id: product-generation:ipad-pro-m4
    candidate_type: ProductGeneration
    score: 0.90
    decision: needs_review
    match_method: exact_alias_with_generation_context
    signals:
      - page_title_match
      - generation_context_m4
      - source_scope_ipad
    ambiguity_set:
      - product-line:ipad-pro
      - product-generation:ipad-pro-m4
```

Production facts 應保存 canonical entity IDs，而不是 resolution metadata。Resolution metadata 留在 candidate、review 與 audit records。

## Validation

Promotion validation 必須確認：

- subject resolution decision 是 `auto_resolved` 或 reviewer-approved
- object required 時，object resolution decision 是 `auto_resolved` 或 reviewer-approved
- resolved entity type 符合 ADR-021 定義的 predicate role registry
- ambiguity 已解決，或經 review 明確接受
- non-auto resolutions 有 review decisions 記錄

## 影響

Benefits：

- 降低 facts 掛錯 entity 的風險。
- 讓 entity ambiguity 可見且可 review。
- 高信心案例可 deterministic auto-resolution。
- 保留 resolution decisions 的 auditability。

Costs：

- 需要 entity indexes 與 scoring implementation。
- Candidate 與 review records 需要保存 resolution metadata。
- 有些有用 facts 會等待 review，而不是 auto-promoted。

## 後續工作

- 使用 ADR-021 作為 subject 與 object entity type constraints 的 predicate role registry。
- 增加 entity resolution scoring tests。
- 增加 "iPad Pro" 與 "MacBook Pro" 等 ambiguous names fixtures。
- 增加 review UI 或 CLI output 以顯示 ambiguity sets 與 signals。
