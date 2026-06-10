# ADR-013：Source of Truth and Derived Views

## 狀態

Proposed

## 日期

2026-06-10

## 背景

前面的 ADR 已定義 sources、entities、facts、pages、retrieval indexes、freshness、ingestion 與 content generation。這些層有些會表示相似知識。例如 entity 可能有 `uses_chip` relationship，而 fact layer 也可能有 `fact:iphone-15-pro:uses-chip`。

如果沒有明確的 source-of-truth 規則，relationships、pages、search indexes、vector payloads 與 generated outputs 可能會和 accepted facts 與 evidence 產生 drift。

## 決策

以 Postgres production records 作為 canonical source of truth。除非另有明確定義，relationships、indexes、rendered pages、answer contexts 與 generated content 都視為 derived views。

Canonical production records：

- `sources`
- `evidence`
- `entities`
- `facts`
- fact version 與 supersession records
- review decisions
- page records 與 page generation state
- job 與 publication audit records

Derived records and views：

- 用於 traversal 的 entity relationship projections
- graph index
- keyword index
- vector index
- rendered wiki pages
- LLM answer contexts
- generated content outputs

## Fact Ownership

任何可回答或可引用的 claim 都必須表示為帶有 source-backed evidence 的 production fact。

Entity relationships 只能作為：

1. 不作為 cited factual claim 使用的 identity-level metadata，或
2. 從 accepted production facts materialize 出來的 projections。

LLM answers 必須引用 production facts 與 evidence，不得將 entity relationship rows、wiki paragraphs、vector payloads 或 generated content 當成 canonical evidence。

Canonical fact 範例：

```yaml
id: fact:iphone-15-pro:uses-chip
subject: product:iphone-15-pro
predicate: uses_chip
object: chip:a17-pro
value: A17 Pro
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
```

Derived relationship 範例：

```yaml
from: product:iphone-15-pro
type: uses_chip
to: chip:a17-pro
source_fact_id: fact:iphone-15-pro:uses-chip
projection_version: 3
```

## Page Ownership

Wiki pages 是 facts、entities、evidence 與 editorial summaries 的 curated presentations。Page 可以作為有用的 LLM context，但 page 上的 factual claims 仍必須追溯到 production facts。

當 page 與 production fact 衝突時，以 production fact 為準，page 必須重新生成或進入 review。

## Generated Content Ownership

Generated content 是 application-layer output。除非透過獨立 ingestion 與 review process 將特定 claims promote 成 candidate facts，再 promote 成 production facts，否則 generated content 不得成為 source-backed knowledge。

Generated scripts、question banks、summaries 與 recommendations 只要包含 factual claims，就必須透過 claim-level traceability reference facts。

## Invariants

- Production facts 是唯一 canonical answerable claims。
- Production facts 必須指向 evidence records。
- Derived stores 必須保留足夠 metadata 以追溯 canonical IDs。
- Deprecated、superseded、disputed 或 stale facts 不得在 derived views 中默默維持 active。
- Derived views 必須能從 canonical records 重建。

## 影響

Benefits：

- 避免 relationships、pages 與 indexes 變成互相競爭的 truth stores。
- 讓 citation behavior 可預期。
- 讓 indexes 與 generated outputs 可以安全重建。
- 更容易偵測 drift。

Costs：

- 需要 projection metadata 與 rebuild tooling。
- Query paths 在回答前可能需要從 canonical records hydrate derived results。
- Page 與 index updates 必須回應 fact lifecycle changes。

## 後續工作

- 定義 graph relationships 的 projection tables。
- 定義 page regeneration triggers。
- 定義 derived-view rebuild commands。
- 定義 derived views 對 canonical facts 的 validation。
