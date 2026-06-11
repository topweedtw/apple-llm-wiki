# Implementation Plan

This plan turns the ADR set into an executable engineering roadmap. The first
goal is not to build the entire Apple LLM Wiki at once. The first goal is to
ship one correct vertical slice:

```text
Apple technical specification URL
 -> source snapshot
 -> candidate facts and evidence
 -> validation and review
 -> production facts
 -> retrieval context
 -> cited answer
```

## Guiding Principles

- Keep Postgres production records as the canonical source of truth.
- Treat indexes, graph projections, pages, and answer contexts as derived views.
- Never promote a candidate fact without evidence.
- Prefer deterministic parsers before LLM-assisted extraction.
- Make review and promotion state transitions explicit and testable.
- Hydrate facts and evidence from canonical records before answer generation.

## Phase 0: Project Skeleton

Goal: create the implementation foundation without committing to heavy
infrastructure too early.

Deliverables:

- application runtime and package structure
- database migration setup
- test runner and fixture directory
- local development configuration
- coding conventions for IDs, timestamps, enums, and validation errors

Exit criteria:

- migrations can run on a local database
- tests can run in CI or a local command
- fixture files can be loaded by parser tests

## Phase 1: Canonical Data Model

Goal: implement the canonical schema described by ADR-003, ADR-013, and
ADR-014.

Initial tables:

- `sources`
- `source_snapshots`
- `evidence`
- `entities`
- `entity_aliases`
- `candidate_sources`
- `candidate_facts`
- `candidate_fact_issues`
- `facts`
- `fact_supersession`
- `review_decisions`
- `publication_events`
- `unit_registry`
- `predicate_registry`
- `index_outbox`

Required constraints:

- production facts require `source_refs`
- production facts cannot contain `review_status`
- candidate facts can contain unresolved fields only when issues record why
- `needs_review` is allowed only on candidate or review records
- candidate issue states must use the ADR-014 enum values
- fact freshness must use the ADR-006 production freshness values

Exit criteria:

- schema tests reject production facts without evidence
- schema tests reject production facts with `needs_review`
- schema tests allow incomplete candidate facts only with explicit issues

## Phase 2: Ingestion Pipeline MVP

Goal: support one deterministic ingestion path for an Apple technical
specification page.

Pipeline:

```text
register candidate source
 -> fetch source
 -> create snapshot
 -> classify source
 -> parse known fields
 -> create evidence anchors
 -> create candidate entities and candidate facts
 -> run candidate intake validation
```

Initial parser target:

- one Apple technical specification page fixture
- fields such as product name, chip, display size, connector, release date, and
  model identifiers

Services:

- `SourceRegistrationService`
- `SourceFetcher`
- `SnapshotStore`
- `SourceClassifier`
- `TechSpecParser`
- `CandidateFactWriter`
- `CandidateValidationService`

Exit criteria:

- a fixture snapshot produces candidate facts and evidence
- parser golden tests compare output to expected YAML or JSON
- candidate facts with missing evidence become blocked or `needs_review`

## Phase 3: Review and Promotion

Goal: make candidate-to-production promotion explicit, auditable, and safe.

State machine requirements:

- implement candidate source states from ADR-014
- implement candidate fact states from ADR-014
- implement candidate issue states from ADR-014
- enforce promotion rules in a single promotion service

Services:

- `ReviewDecisionService`
- `CandidateIssueService`
- `FactPromotionService`
- `PublicationAuditService`
- `IndexOutboxWriter`
- `ReviewCommandService`

Promotion flow:

```text
candidate fact approved
 -> blocking issues verified resolved
 -> evidence references verified
 -> entity IDs verified
 -> production fact written
 -> publication event written
 -> index outbox event written
```

Exit criteria:

- promotion succeeds for a reviewed source-backed fact
- promotion fails without evidence
- promotion fails with unresolved entity references
- promotion emits `index_outbox` events in the same database transaction

## Phase 4: Retrieval MVP

Goal: answer exact product-specification questions from production facts.

Retrieval scope:

- entity lookup by canonical ID, name, alias, and model number
- fact lookup by subject and predicate
- evidence hydration
- trust and freshness ranking
- compact answer context construction

Initial supported question type:

```text
What chip does iPhone 15 Pro use?
```

Services:

- `EntityMatcher`
- `FactLookupService`
- `EvidenceHydrationService`
- `FreshnessPolicyService`
- `AnswerContextBuilder`
- `EntityResolutionService`

Exit criteria:

- retrieval returns production facts only
- retrieval ignores candidate facts
- evidence is loaded from canonical records
- stale or disputed facts are surfaced in answer context

## Phase 5: Cited Answer API

Goal: expose a small answer API that proves the knowledge path works.

Initial endpoint:

```http
POST /answer
```

Request:

```json
{
  "question": "What chip does iPhone 15 Pro use?",
  "locale": "en-US"
}
```

Response:

```json
{
  "answer": "iPhone 15 Pro uses the A17 Pro chip.",
  "facts": [
    {
      "id": "fact:iphone-15-pro:uses-chip",
      "freshness": "historical",
      "confidence": "high"
    }
  ],
  "citations": [
    {
      "source_id": "source:apple-tech-specs-iphone-15-pro",
      "evidence_id": "evidence:apple-tech-specs-iphone-15-pro:chip",
      "title": "iPhone 15 Pro - Technical Specifications"
    }
  ]
}
```

Exit criteria:

- answer includes citation metadata
- answer refuses unsupported claims
- current-status questions require freshness checks
- answer generation does not use vector payloads as canonical evidence

## Phase 6: Index Outbox and Derived Views

Goal: implement the consistency model from ADR-015 before adding heavier search
infrastructure.

Initial derived views:

- relationship projection table
- lightweight keyword search projection
- evidence lookup projection

Outbox behavior:

```text
canonical write
 -> index_outbox event
 -> async projection update
 -> processed event
```

Required commands:

- process pending index events
- replay failed index events
- rebuild all derived views
- rebuild projections for one entity
- check index drift

Exit criteria:

- outbox events are idempotent
- projections can be rebuilt from canonical records
- stale projection versions are detectable
- answer retrieval can hydrate canonical facts after using a projection

## Phase 7: Freshness and Re-ingestion

Goal: make current-status claims safe before supporting buying advice or
availability questions.

Deliverables:

- TTL configuration by predicate or fact type
- freshness update job
- checksum comparison for sources
- re-ingestion diff records
- review queue for possibly stale facts

Exit criteria:

- TTL expiration marks current facts as `possibly_stale`
- changed source checksums create review work
- current-status answers warn when only stale facts are available

## Phase 8: Page and Content Generation

Goal: generate human-readable wiki pages and application-layer content without
weakening the fact model.

Deliverables:

- product page renderer
- page freshness inheritance
- question bank schema
- generated content claim references
- validation for unsupported claims

Exit criteria:

- page factual claims link to production facts
- generated factual claims include claim-level traceability
- generated content does not become production facts

## Milestones

Milestone 1: Schema and Promotion Safety

- canonical schema implemented
- promotion service implemented
- invalid promotion tests pass

Milestone 2: First Source Ingested

- one Apple tech spec fixture parsed
- candidate facts and evidence created
- reviewed facts promoted

Milestone 3: First Cited Answer

- exact specification query answered
- response includes fact and evidence citations
- candidate facts are ignored

Milestone 4: Derived View Consistency

- index outbox implemented
- relationship projection built
- rebuild and drift check commands available

Milestone 5: Freshness-Aware Answers

- TTL jobs implemented
- possibly stale facts surfaced
- current-status answer behavior tested

## Test Strategy

Schema tests:

- production facts require evidence
- production facts reject candidate-only fields
- candidate facts require explicit issues when incomplete

Parser tests:

- fixture snapshots produce expected candidate facts
- parser changes are checked against golden output
- evidence locators point to source spans

Promotion tests:

- approved candidate with evidence can promote
- missing evidence blocks promotion
- unresolved entity blocks promotion
- non-blocking issues require explicit acceptance

Retrieval tests:

- exact queries return structured facts
- candidate facts are ignored
- deprecated and superseded facts are excluded unless historical context asks
  for them
- citations hydrate from canonical evidence records

Index tests:

- publication writes outbox events
- event processing is idempotent
- projections can be rebuilt
- drift checks detect stale aggregate versions

Answer tests:

- factual answers include citations
- freshness-sensitive answers check TTL state
- disputed facts are surfaced as uncertainty
- unsupported claims are refused

## Initial Backlog

1. Scaffold TypeScript/Node.js project structure.
2. Add database migration tooling.
3. Create canonical schema migration.
4. Add enum definitions for freshness, confidence, candidate states, issue states,
   and review decisions.
5. Implement source registration.
6. Add fixture snapshot for one Apple technical specification page.
7. Implement deterministic tech spec parser.
8. Implement entity resolution scoring.
9. Implement unit registry and unit normalization.
10. Implement predicate role registry.
11. Implement candidate intake validation.
12. Implement review decision records.
13. Implement CLI review commands and output fixtures.
14. Implement fact promotion service.
15. Implement index outbox writer.
16. Implement exact entity and fact lookup.
17. Implement cited answer endpoint.
18. Add rebuild and drift-check commands.

## Open Decisions

- Whether page rendering should be implemented before semantic/vector retrieval.

Resolved by ADR-019:

- Review starts with CLI/admin commands.
- CLI must support source review, candidate fact review, issue resolution,
  entity resolution approval, promotion blockers, and review history.
- Web UI is introduced when review queue age, volume, multi-reviewer needs,
  visual comparison needs, non-technical reviewer participation, or review
  error rates justify it.

Resolved by ADR-020:

- Production fact units must be `null` or active canonical unit IDs from the unit registry.
- `inch` is canonical for inch values; `in`, `inches`, and `"` are aliases.
- `GB` and `TB` are decimal storage units; `GiB` and `TiB` are binary units and must not be silently converted.
- Promotion validation checks units against the registry.

Resolved by ADR-021:

- Predicate definitions declare allowed subject entity types, object requirements, allowed object entity types, value types, unit dimensions, temporal behavior, and locale policy.
- Entity resolution scoring uses predicate role constraints.
- Promotion validation rejects facts whose subject/object entity types or value types do not match the predicate registry.

Resolved by ADR-018:

- Entity resolution uses deterministic scoring.
- Auto-resolution requires score `>= 0.95`, a `0.10` margin over the next
  candidate, matching predicate role, and no source-scope conflict.
- Ambiguous names such as "iPad Pro" remain in review unless source context
  disambiguates the product line, generation, product, or variant.

Resolved by ADR-017:

- Runtime: TypeScript on Node.js Active LTS.
- Package manager: pnpm.
- Web API: Fastify REST endpoints.
- CLI: Commander commands.
- Database access: Kysely with `pg`.
- Migration approach: checked-in SQL migration files run by a thin TypeScript
  migration runner.
