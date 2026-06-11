# ADR-015: Index Consistency and Rebuild Policy

## Status

Accepted

## Date

2026-06-10

## Context

ADR-005 defines separate retrieval indexes for entities, facts, graph traversal, keyword search, vector search, and evidence retrieval. ADR-010 starts with Postgres as the system of record and uses Postgres full-text search, pgvector, and relational graph tables initially.

The system needs explicit consistency rules so retrieval indexes do not serve stale, deprecated, superseded, or disputed knowledge as if it were current canonical truth.

## Decision

Use an outbox-based indexing model. Canonical writes happen in Postgres first. Index updates are asynchronous, versioned, replayable, and rebuildable from canonical production records.

Indexes are eventually consistent derived views. They are not canonical.

## Write Flow

Production publication must run in a database transaction:

1. update canonical Postgres records
2. insert one or more `index_outbox` events in the same transaction
3. commit the transaction

Index workers then:

1. read pending `index_outbox` events
2. update keyword, vector, graph, entity, fact, or evidence indexes
3. store indexed aggregate ID and version
4. mark the event processed

Example event:

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

Every indexed document must store:

- canonical aggregate ID
- aggregate type
- aggregate version
- source table or projection name
- indexed_at
- freshness
- lifecycle status
- locale or scope when applicable

The system should be able to compare an indexed document version with the canonical Postgres version.

## Retrieval Hydration

Retrieval may use indexes to find candidates, but answer generation must hydrate or verify facts and evidence from canonical records before producing cited answers.

The answer layer must not answer directly from vector payloads when the canonical fact has become:

- deprecated
- superseded
- disputed
- deleted from the active projection
- stale or `possibly_stale` for a current-status query

## Failure Handling

Index workers should:

- retry failed events with backoff
- keep failure reasons
- move repeatedly failing events to a dead-letter state
- expose pending, failed, and dead-letter counts as metrics
- support manual replay of failed events

Outbox events must be idempotent. Reprocessing the same event should produce the same indexed state for the same aggregate version.

## Rebuild Policy

All derived indexes must be rebuildable from canonical Postgres records.

Rebuild types:

- full rebuild for an entire index
- scoped rebuild for one aggregate type
- entity-scoped rebuild for one product, product line, or related graph
- event replay from a known outbox checkpoint

Rebuild jobs should record:

- rebuild type
- requested by
- started_at
- completed_at
- source checkpoint
- index version
- success or failure summary

## Consistency Checks

The system should periodically check:

- indexed aggregate version is not older than canonical version
- deprecated or superseded facts are not active in indexes
- evidence IDs referenced by indexes still exist
- graph projections match accepted relationship facts
- vector payloads do not contain active claims from rejected or candidate facts

## Consequences

Benefits:

- Canonical writes stay simple and auditable.
- Indexes can lag without becoming truth stores.
- Failed index updates can be retried or replayed.
- Vector and graph results can be verified before answer generation.

Costs:

- Requires outbox tables and index workers.
- Retrieval may need an extra canonical hydration step.
- Rebuild tooling and consistency checks must be maintained.

## Follow-up Work

- Tracked by implementation plan Phase 1: define the `index_outbox` schema.
- Tracked by implementation plan Phase 6: define indexed document metadata for
  derived views and projections.
- Tracked by implementation plan Phase 5 and Phase 6: add canonical hydration
  to answer generation after projection lookup.
- Tracked by implementation plan Phase 6 and initial backlog: add index drift
  checks.
- Tracked by implementation plan Phase 6 and initial backlog: add full and
  scoped rebuild commands.
