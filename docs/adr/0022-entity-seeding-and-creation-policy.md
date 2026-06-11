# ADR-022: Entity Seeding and Creation Policy

## Status

Accepted

## Date

2026-06-11

## Context

ADR-008 and the architecture flow describe extraction output that includes
candidate entities. ADR-018 marks a resolution `unresolved` when "the candidate
appears to be a new entity that must be created first". ADR-014 defines state
machines for candidate sources, candidate facts, and candidate issues, but not
for candidate entities.

This leaves two gaps before implementation:

- The Phase 1 table list has no `candidate_entities` table, and no ADR defines
  how a new production entity is created, reviewed, or promoted.
- Entity resolution in Phase 2 requires canonical entities such as
  `product:iphone-15-pro` and `chip:a17-pro` to already exist, but no document
  states where the initial entities come from.

A full candidate-entity promotion workflow would mirror the candidate fact
state machine and require its own review operations. That is more machinery
than the first vertical slice needs.

## Decision

For the first vertical slice, canonical entities are seeded manually. Ingestion
does not create production entities.

Specifically:

- Canonical entities and their aliases are created through checked-in seed data
  applied by migrations or a CLI `entity create` command.
- Seed data changes are reviewed like code, through version control review.
  This review substitutes for a candidate-entity state machine at this stage.
- Extraction emits entity references inside candidate fact resolution metadata
  (ADR-018), not standalone candidate entity records.
- A `candidate_entities` table and a candidate-entity promotion state machine
  are deferred to a later ADR. Until then, references to "candidate entities"
  in ADR-008 and the architecture flow mean unresolved entity references stored
  on candidate facts.

## Seed Scope for the First Vertical Slice

The initial seed must contain the entities required by the first Apple
technical specification fixture, at minimum:

- `product-line:iphone`
- `product-generation:iphone-15-series`
- `product:iphone-15-pro`
- `chip:a17-pro`
- supporting aliases and model numbers used by entity resolution fixtures

Seed records must satisfy the ADR-002 base entity fields and lifecycle status
rules. `needs_review` remains disallowed on production entities.

## New Entity Flow During Ingestion

When entity resolution returns `unresolved` because no canonical entity exists:

1. The candidate fact stays in review with an unresolved entity issue.
2. A maintainer creates the missing entity through seed data or `entity create`.
3. Entity resolution is re-run for the affected candidate facts.
4. Normal review and promotion continue under ADR-014 and ADR-018.

Ingestion, parsers, and LLM-assisted extraction must not insert rows into the
production `entities` table.

## Redirects and Merges

ADR-002 allows `redirect` and `merged` statuses. For the first vertical slice:

- Redirect entities may be created through the same seed or CLI path.
- Entity merges are manual operations that must write a review decision record
  describing the merge reason and affected references.
- A full merge and reference-rewrite procedure is deferred to a later ADR.

## Consequences

Benefits:

- Phase 2 has a concrete, unblocking answer for where entities come from.
- Production entities keep a single, auditable creation path.
- The candidate-entity state machine is deferred until ingestion volume
  justifies it, instead of being designed speculatively.

Costs:

- New products require a manual seed step before their facts can be promoted.
- Some candidate facts will wait in review until an entity is seeded.
- A later ADR is still needed when entity creation volume outgrows manual
  seeding.

## Alternatives Considered

### Candidate-Entity State Machine Now

Rejected for the first slice because it duplicates the candidate fact review
machinery before any real ingestion volume exists.

### Auto-Create Entities During Extraction

Rejected because wrong or duplicate entities would corrupt the identity layer
that facts, citations, and retrieval depend on. ADR-018 already requires
conservative resolution; silent entity creation would bypass it.

## Follow-up Work

- Add entity seed data and an `entity create` CLI command to the implementation
  plan backlog.
- Define the candidate-entity promotion state machine in a later ADR when
  ingestion needs it.
- Define the full entity merge and redirect procedure in a later ADR.
