# ADR-015：Index Consistency and Rebuild Policy

## 狀態

Proposed

## 日期

2026-06-10

## 背景

ADR-005 定義 entity、fact、graph traversal、keyword search、vector search 與 evidence retrieval 等獨立 retrieval indexes。ADR-010 則以 Postgres 作為 system of record，初期使用 Postgres full-text search、pgvector 與 relational graph tables。

系統需要明確 consistency rules，避免 retrieval indexes 將 stale、deprecated、superseded 或 disputed knowledge 當成 current canonical truth 回傳。

## 決策

使用 outbox-based indexing model。Canonical writes 先發生在 Postgres。Index updates 採 asynchronous、versioned、replayable，並且可從 canonical production records rebuild。

Indexes 是 eventually consistent derived views，不是 canonical。

## Write Flow

Production publication 必須在 database transaction 中執行：

1. update canonical Postgres records
2. 在同一 transaction 中 insert one or more `index_outbox` events
3. commit transaction

Index workers 接著：

1. 讀取 pending `index_outbox` events
2. 更新 keyword、vector、graph、entity、fact 或 evidence indexes
3. 儲存 indexed aggregate ID 與 version
4. 將 event 標記為 processed

Event 範例：

```yaml
id: index-event:2026-06-10:000001
type: fact.promoted
aggregate_type: fact
aggregate_id: fact:iphone-15-pro:uses-chip
aggregate_version: 3
occurred_at: 2026-06-10T10:00:00Z
status: pending
```

## Indexed Document Metadata

每個 indexed document 必須儲存：

- canonical aggregate ID
- aggregate type
- aggregate version
- source table 或 projection name
- indexed_at
- freshness
- lifecycle status
- locale 或 scope when applicable

系統應能比較 indexed document version 與 canonical Postgres version。

## Retrieval Hydration

Retrieval 可以使用 indexes 尋找 candidates，但 answer generation 在產生 cited answers 前，必須從 canonical records hydrate 或 verify facts 與 evidence。

當 canonical fact 已變成以下狀態時，answer layer 不得直接從 vector payloads 回答：

- deprecated
- superseded
- disputed
- deleted from active projection
- 對 current-status query 而言已 stale 或 `possibly_stale`

## Failure Handling

Index workers 應該：

- 用 backoff retry failed events
- 保留 failure reasons
- 將重複失敗的 events 移到 dead-letter state
- 將 pending、failed 與 dead-letter counts 暴露為 metrics
- 支援 failed events 的 manual replay

Outbox events 必須 idempotent。重複處理同一 event，對同一 aggregate version 應產生相同 indexed state。

## Rebuild Policy

所有 derived indexes 都必須能從 canonical Postgres records rebuild。

Rebuild types：

- full rebuild for an entire index
- scoped rebuild for one aggregate type
- entity-scoped rebuild for one product、product line 或 related graph
- event replay from a known outbox checkpoint

Rebuild jobs 應記錄：

- rebuild type
- requested by
- started_at
- completed_at
- source checkpoint
- index version
- success or failure summary

## Consistency Checks

系統應定期檢查：

- indexed aggregate version 不早於 canonical version
- deprecated 或 superseded facts 未在 indexes 中 active
- indexes reference 的 evidence IDs 仍存在
- graph projections 符合 accepted relationship facts
- vector payloads 不包含 rejected 或 candidate facts 的 active claims

## 影響

Benefits：

- Canonical writes 保持簡單且可稽核。
- Indexes 可以 lag，但不會變成 truth stores。
- Failed index updates 可以 retry 或 replay。
- Vector 與 graph results 在 answer generation 前可以被 verify。

Costs：

- 需要 outbox tables 與 index workers。
- Retrieval 可能需要額外 canonical hydration step。
- Rebuild tooling 與 consistency checks 需要維護。

## 後續工作

- 定義 `index_outbox` schema。
- 定義 indexed document metadata schema。
- 在 answer generation 加入 canonical hydration。
- 增加 index drift checks。
- 增加 full 與 scoped rebuild commands。
