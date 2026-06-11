# ADR-013: Source of Truth and Derived Views

## Status

Accepted

## Date

2026-06-10

## Context

The previous ADRs define sources, entities, facts, pages, retrieval indexes, freshness, ingestion, and content generation. Several of these layers can represent similar knowledge. For example, an entity may have a `uses_chip` relationship, while the fact layer may also contain `fact:iphone-15-pro:uses-chip`.

Without a clear source-of-truth rule, relationships, pages, search indexes, vector payloads, and generated outputs can drift away from accepted facts and evidence.

## Decision

Use Postgres production records as the canonical source of truth. Treat relationships, indexes, rendered pages, answer contexts, and generated content as derived views unless explicitly stated otherwise.

Canonical production records:

- `sources`
- `evidence`
- `entities`
- `facts`
- fact version and supersession records
- review decisions
- page records and page generation state
- job and publication audit records

Derived records and views:

- entity relationship projections used for traversal
- graph index
- keyword index
- vector index
- rendered wiki pages
- LLM answer contexts
- generated content outputs

## Fact Ownership

Any answerable or citeable claim must be represented as a production fact with source-backed evidence.

Entity relationships may exist only as:

1. identity-level metadata that is not used as a cited factual claim, or
2. materialized projections from accepted production facts.

LLM answers must cite production facts and evidence. They must not cite entity relationship rows, wiki paragraphs, vector payloads, or generated content as canonical evidence.

Example canonical fact:

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

Example derived relationship:

```yaml
from: product:iphone-15-pro
type: uses_chip
to: chip:a17-pro
source_fact_id: fact:iphone-15-pro:uses-chip
projection_version: 3
```

## Page Ownership

Wiki pages are curated presentations of facts, entities, evidence, and editorial summaries. A page may be useful LLM context, but factual claims on a page remain traceable to production facts.

When a page conflicts with a production fact, the production fact wins and the page must be regenerated or reviewed.

## Generated Content Ownership

Generated content is an application-layer output. It must not become source-backed knowledge unless a separate ingestion and review process promotes specific claims into candidate facts and then production facts.

Generated scripts, question banks, summaries, and recommendations must reference facts through claim-level traceability when they contain factual claims.

## Invariants

- Production facts are the only canonical answerable claims.
- Production facts must point to evidence records.
- Derived stores must include enough metadata to trace back to canonical IDs.
- Deprecated, superseded, disputed, or stale facts must not remain silently active in derived views.
- Rebuilding derived views from canonical records must be possible.

## Consequences

Benefits:

- Prevents relationships, pages, and indexes from becoming competing truth stores.
- Keeps citation behavior predictable.
- Allows indexes and generated outputs to be rebuilt safely.
- Makes drift easier to detect.

Costs:

- Requires projection metadata and rebuild tooling.
- Query paths may need to hydrate derived results from canonical records before answering.
- Page and index updates must respond to fact lifecycle changes.

## Follow-up Work

- Define projection tables for graph relationships.
- Define page regeneration triggers.
- Define derived-view rebuild commands.
- Define validation that checks derived views against canonical facts.
