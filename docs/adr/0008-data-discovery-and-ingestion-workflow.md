# ADR-008: Data Discovery and Ingestion Workflow

## Status

Proposed

## Date

2026-06-10

## Context

The previous ADRs define the knowledge architecture, entity schema, fact model, source trust levels, retrieval strategy, freshness policy, and answer citation rules. The next missing decision is operational: how new Apple product knowledge should be found, evaluated, extracted, reviewed, and added to the knowledge base.

Without a defined ingestion workflow, the system risks adding duplicated sources, weak facts, uncited claims, stale data, or facts attached to the wrong entities.

## Decision

Use a staged data discovery and ingestion workflow.

No source or claim should move directly from search results into production knowledge. Every addition should pass through discovery, source registration, extraction into candidate records, entity resolution, evidence creation, validation, review, and publication.

## Workflow Overview

1. Discover candidate sources.
2. Register candidate sources.
3. Fetch and snapshot source content.
4. Classify source trust and scope.
5. Extract candidate entities, facts, and evidence.
6. Resolve entities and aliases.
7. Validate facts against schema rules.
8. Review source and fact quality.
9. Publish accepted facts and pages.
10. Schedule freshness checks.

## Source Discovery

Source discovery should start from official Apple sources whenever possible.

Preferred search order:

1. Apple official technical specifications
2. Apple Newsroom
3. Apple Support
4. Apple Developer documentation
5. Apple Store and archived Apple pages
6. Trusted secondary sources
7. Retailer, carrier, regulatory, or repair sources
8. Community sources for discovery only

Search queries should include product names, model identifiers, Apple support identifiers, event names, and known aliases.

Example discovery query set:

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

Discovered sources should enter a candidate queue before ingestion.

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

The queue prevents duplicate crawling and creates an audit trail for why a source was considered.

## Fetch and Snapshot

When a candidate source is accepted for ingestion, the system should fetch and snapshot its content.

The snapshot should store:

- URL
- title
- publisher
- fetched timestamp
- locale
- content checksum
- normalized text
- relevant HTML or document structure
- retrieval errors, if any

Snapshots make later fact review and freshness comparison possible.

## Source Classification

After fetching, classify the source using ADR-004.

Required classification fields:

- `source_type`
- `trust_level`
- `scope`
- `locale`
- `review_status`

Unclassified sources default to:
- `trust_level`: `unknown`
- `review_status`: `needs_review`

## Extraction

Extraction should produce candidate records, not production facts.

Candidate extraction outputs:

- candidate entities
- candidate aliases
- candidate facts stored in `candidate_facts`
- evidence records
- source sections
- extraction confidence
- unresolved references
- issues describing missing evidence, unresolved entities, unnormalized units, or schema problems

LLM-assisted extraction is allowed, but it produces candidate facts only. A candidate fact without evidence may remain in `candidate_facts` with `review_status: needs_review`, or be rejected. It must not be promoted into the production `facts` table.

## Entity Resolution

Before facts are accepted, the system must resolve subjects and objects to canonical entity IDs.

Resolution should use:

- exact entity IDs
- canonical names
- aliases
- model numbers
- Apple identifiers
- generation relationships
- source context

If resolution is ambiguous, the candidate fact remains in review and must not be published.

## Validation

Validation has two stages: candidate intake validation and promotion validation.

Candidate intake validation checks whether a candidate record is reviewable. It may allow incomplete records when the missing or invalid parts are explicitly captured in `issues`.

Candidate intake checks:

- required fields exist
- predicate is allowed or proposed
- value type matches predicate
- unit is normalized, or an `unnormalized_unit` issue is recorded
- normalized `value` exists, or a missing-normalization issue is recorded
- source wording is preserved through evidence, `raw_value`, or source snapshot context
- source refs point to existing evidence, or a `missing_evidence` issue is recorded
- subject and object entities exist, or unresolved entity issues are recorded
- locale and time qualifiers are valid
- extraction confidence is set
- candidate `issues` describe missing evidence, unresolved entities, unnormalized units, or schema problems

Promotion validation checks whether a candidate fact can become a production fact.

Promotion checks:

- all production fact required fields exist
- predicate is allowed
- value type matches predicate
- unit is normalized
- `value` is normalized according to the predicate and `value_type`
- `raw_value`, when present, does not replace evidence
- source refs point to existing evidence
- subject and object entities exist
- locale and time qualifiers are valid
- freshness and confidence are set
- candidate `issues` are resolved, accepted as non-blocking, or explicitly rejected

Validation failure should block publication.

## Review

Review should answer these questions:

- Is the source appropriate for this claim?
- Is the entity resolution correct?
- Does the evidence support the fact?
- Is the value normalized correctly?
- Is the claim time-sensitive or locale-specific?
- Does it conflict with existing facts?
- Should the candidate fact be promoted to production, revised, rejected, or kept in review?

## Publication

Publishing accepted data should:

- create or update source records
- create or update entities
- promote accepted candidate facts into production facts
- attach evidence records
- update wiki pages or page queues
- update indexes
- schedule freshness checks

Publication should be auditable and reversible through version history.

## Re-ingestion

Existing sources should be re-ingested when:

- source checksum changes
- freshness TTL expires
- Apple announces related products
- conflicts are detected
- a user asks a current-status question
- manual review requests it

Re-ingestion should produce diffs rather than destructive overwrites.

## Consequences

Benefits:

- Prevents raw search results from becoming unsupported facts.
- Keeps evidence attached from the beginning.
- Makes ingestion auditable.
- Supports safe use of LLM-assisted extraction.
- Improves entity consistency and citation quality.

Costs:

- More workflow steps before data becomes available.
- Requires queues, validation, and review tooling.
- Some useful candidate data may stay pending until reviewed.

## Alternatives Considered

### Direct Search-to-Fact Import

Rejected because it allows weak, duplicated, or uncited claims into the knowledge base.

### Manual Curation Only

Rejected because Apple product knowledge is large and changes often. Manual review is needed, but discovery and extraction should be assisted.

### Fully Automated Ingestion

Rejected because entity resolution, source trust, conflicts, and citation quality require review for high reliability.

## Follow-up Work

- Define ingestion queue schema.
- Define source snapshot storage.
- Define extraction prompts and parsers.
- Define review UI and approval states.
- Define re-ingestion diff format.
