# ADR-005：Hybrid Retrieval Strategy

## 狀態

Proposed

## 日期

2026-06-10

## 背景

Apple 產品問題並不都相同。有些需要精確查詢，例如 model numbers 或 release dates。有些需要語意搜尋，例如「哪台 iPad 適合畫圖」。有些需要 graph traversal，例如配件相容性。有些需要 freshness checks，例如目前販售狀態。

純向量搜尋很方便，但對精確規格、日期、數字與相容性不可靠。純結構化資料庫很精確，但對探索型問題較弱。

## 決策

採用 hybrid retrieval，並使用 deterministic retrieval plan。

Retrieval 應結合：

- Entity matching
- Structured fact lookup
- Graph traversal
- Keyword search
- Vector search
- Source evidence retrieval
- Freshness and trust ranking

## Retrieval Pipeline

預設使用以下順序：

1. 解析 user intent 並偵測 time sensitivity。
2. 匹配 entities 與 aliases。
3. 取得 matched entities 的 structured facts。
4. 當需要比較或相容性時，進行 graph relationships traversal。
5. 對 exact terms、model numbers 與 quoted phrases 執行 keyword search。
6. 對語意 context 與 explanatory pages 執行 vector search。
7. 取得可引用 facts 的 evidence snippets。
8. 依 trust、freshness、specificity 與 locale 排序。
9. 為 LLM 建立精簡 answer context。

## Query Types

### Exact Specification Query

範例：「iPhone 15 Pro 使用哪顆晶片？」

優先 retrieval：

1. Entity match: `product:iphone-15-pro`
2. Fact lookup: `uses_chip`
3. Evidence retrieval

### Comparison Query

範例：「比較 iPhone 15 Pro 和 iPhone 16 Pro。」

優先 retrieval：

1. 匹配兩個產品 entities
2. 查詢 shared predicate facts
3. 抽取差異
4. 為主要主張取得 evidence

### Compatibility Query

範例：「Apple Pencil Pro 可以搭配 iPad Pro M4 嗎？」

優先 retrieval：

1. 匹配 accessory 與 product
2. 查詢 compatibility facts
3. Graph traversal 到 generation 或 variant
4. 檢查 required OS 或 hardware qualifiers

### Freshness-Sensitive Query

範例：「這個現在還有賣嗎？」

優先 retrieval：

1. Entity match
2. Current availability facts
3. Freshness check
4. Recent source verification

### Exploratory Query

範例：「剪影片應該買哪台 Mac？」

優先 retrieval：

1. 匹配 entity 與 product line
2. Semantic page retrieval
3. 對候選產品查詢 structured facts
4. 對購買建議做 freshness check

## Ranking Signals

Result ranking 應考慮：

- Entity match confidence
- Source trust level
- Freshness status
- Locale match
- Predicate relevance
- Evidence specificity
- Verification recency
- Fact 是否 disputed
- Fact 是 derived 還是 directly sourced

官方且新鮮的 evidence 應優先於較弱或過期 evidence，但較低排序 evidence 仍應保留，用於 conflict explanations。

## Indexes

系統應維護分離 indexes：

- Entity index：IDs、aliases、model numbers、names
- Fact index：structured predicates and values
- Graph index：relationships
- Keyword index：exact source and page search
- Vector index：semantic page and snippet search
- Evidence index：citation retrieval

## Answer Context

LLM 應收到精簡且排序後的 context：

```yaml
query_intent: exact_specification
matched_entities:
  - product:iphone-15-pro
facts:
  - id: fact:iphone-15-pro:uses-chip
    value: A17 Pro
    confidence: high
    freshness: historical
    source_refs:
      - source:apple-tech-specs-iphone-15-pro
evidence:
  - id: evidence:apple-tech-specs-iphone-15-pro:chip
    quote: A17 Pro chip
```

Context 應包含足以回答的 evidence，而不是每份 retrieved document。

## 影響

優點：

- 精確問題能得到精確回答。
- 語意問題仍能處理。
- 相容性與比較可以使用結構化資料。
- LLM context 更小且更可靠。
- Freshness 與 trust 成為 retrieval 的一部分，而不只在 answer generation 才處理。

成本：

- 需要維護多個 indexes。
- Query planning 比單純 vector search 更複雜。
- Entity resolution 品質變得重要。

## 考慮過的替代方案

### 只使用 Vector Search

不採用，因為它對規格、數字、日期與相容性不可靠。

### 只使用 SQL / Structured Search

不採用，因為它對探索型與自然語言問題較弱。

## 後續工作

- Entity resolution scoring 已由 ADR-018 定義，並由 ADR-021 約束。
- 定義 entity resolution scoring 之外的 retrieval ranking weights。
- 定義 retrieval evaluation sets。
- 定義 LLM answers 的 context packing limits。
