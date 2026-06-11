# ADR-011: Crawl Validation and Ingestion Quality Assurance

## Status

Accepted

## Date

2026-06-10

## Context

The Apple LLM Wiki relies on crawled and extracted source data. A crawler that completes successfully is not enough. The system must prove that it fetched the correct page, preserved a useful snapshot, extracted the right fields, attached evidence, resolved entities correctly, and produced valid facts.

Without quality gates, the wiki can accumulate wrong facts, stale data, broken citations, duplicated sources, or facts linked to the wrong Apple product.

## Decision

Validate ingestion through layered automated checks plus human review gates.

The system should test the full data path:

```text
source page
→ snapshot
→ parser output
→ candidate facts
→ evidence
→ entity resolution
→ validated facts
→ wiki page
→ cited answer
```

No candidate fact should be promoted into the production `facts` table unless it passes required validation.

## Validation Layers

### Source Fetch Validation

Checks:

- HTTP status is acceptable.
- final URL is expected.
- page title matches source intent.
- locale is detected.
- content is non-empty.
- checksum is stored.
- snapshot is created.

Failure blocks ingestion.

### Snapshot Regression Validation

Important sources should have fixture snapshots.

Fixtures should be used to test parser changes against known Apple page structures.

Example:

```text
fixtures/apple/iphone-15-pro-tech-specs.html
fixtures/apple/iphone-15-pro-tech-specs.expected.yaml
```

### Parser Golden Tests

Parser output should be compared to expected structured results.

Example:

```yaml
expected:
  product: iPhone 15 Pro
  chip: A17 Pro
  connector: USB-C
  display_size:
    value: 6.1
    unit: inch
```

Parser regressions should fail tests before ingestion jobs run in production.

### Evidence Validation

Every production fact must reference evidence.

Required evidence fields:

- `source_id`
- `evidence_id`
- `locator`
- `quote` or equivalent source span
- `retrieved_at`

Candidate facts without evidence must remain in `candidate_facts` with `review_status: needs_review`, or be rejected. They must not be inserted into the production `facts` table.

### Candidate Issue Validation

Candidate facts may be incomplete, but incompleteness must be explicit.

Required issue tracking:

- missing evidence
- unresolved subject or object entity
- unnormalized unit
- invalid or proposed predicate
- invalid locale or time qualifier
- schema mismatch

Promotion is blocked until blocking issues are resolved. Non-blocking issues must be explicitly accepted during review.

### Entity Resolution Validation

Entity resolution must verify that extracted names map to canonical entity IDs.

Examples:

```text
iPhone 15 Pro → product:iphone-15-pro
A17 Pro → chip:a17-pro
iPhone15,2 → product:iphone-15-pro
```

Ambiguous matches must not be auto-published.

### Fact Schema Validation

Facts must pass schema validation:

- required fields exist
- predicate is allowed
- value type matches predicate
- value is normalized for the predicate
- unit is normalized against the unit registry
- raw source wording is preserved through evidence, raw_value, or snapshot context
- locale is valid
- freshness is set
- confidence is set
- source refs point to existing evidence

### Cross-Source Consistency Validation

When multiple sources describe the same fact, the system should compare values.

Outcomes:

- same value: merge or add supporting evidence
- different locale or time range: keep separate facts
- same scope but conflicting value: mark `disputed`

### End-to-End Answer Validation

The system should test representative questions.

Example:

```text
Question: What chip does iPhone 15 Pro use?
Expected answer: A17 Pro
Expected citation: Apple technical specifications evidence
```

The test should verify answer value, citation presence, and source quality.

## Quality Gates

Required gates before publication:

1. source fetch validation
2. snapshot creation
3. parser or extraction validation
4. evidence validation
5. candidate issue validation
6. entity resolution validation
7. fact schema validation, including normalized values, normalized units, and raw source wording preservation
8. freshness assignment
9. review approval for risky or ambiguous data

## Metrics

Track:

- fetch success rate
- parser success rate
- extraction confidence distribution
- entity resolution ambiguity rate
- evidence coverage
- fact validation failure rate
- disputed fact count
- stale fact count
- review queue age

## Consequences

Benefits:

- Crawler correctness becomes measurable.
- Parser changes can be tested safely.
- Evidence coverage improves citation reliability.
- Wrong or ambiguous facts are blocked before publication.

Costs:

- Requires fixture maintenance.
- Adds ingestion latency.
- Requires validation tooling and review queues.

## Alternatives Considered

### Only Test That Crawlers Run

Rejected because successful crawling does not prove correct extraction or citation quality.

### Manual Review Without Automated Tests

Rejected because manual review alone does not scale and cannot catch parser regressions consistently.

## Follow-up Work

- Define fixture directory structure.
- Define expected-output YAML schema.
- Add ingestion validation command.
- Add end-to-end cited answer tests.
