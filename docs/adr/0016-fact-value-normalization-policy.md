# ADR-016: Fact Value Normalization Policy

## Status

Proposed

## Date

2026-06-11

## Context

ADR-003 defines production facts with `value`, `value_type`, optional `unit`, and evidence-backed citations. During review, a question came up about whether facts should also include `raw_value`, `normalized_value`, and `normalized_unit`.

The system needs a clear value policy before implementation. Otherwise, ingestion, validation, retrieval, and answer generation may disagree about which field is source wording, which field is queryable data, and which field should be displayed to users.

## Decision

Use `value` as the normalized, queryable fact value. Use `evidence.quote` as the canonical source wording. Allow `raw_value` as an optional convenience field when a concise source phrase is useful, but do not introduce `normalized_value` as a separate production fact field at this stage.

The production fact model should therefore use:

- `value`: normalized value used for query, comparison, rendering, and answer context
- `value_type`: type of `value`
- `unit`: normalized unit when the fact is numeric, money, range, or otherwise unit-bearing
- `object`: canonical entity ID for entity relation facts when the value points to another entity
- `raw_value`: optional concise source wording or extracted phrase, never canonical by itself
- `evidence.quote`: authoritative source quote or source span that supports the fact

## Rationale

`normalized_value` is not introduced now because it would duplicate existing fields:

- for entity relation facts, `object` is the normalized entity reference
- for scalar facts, `value` plus `unit` is the normalized queryable representation
- for enum facts, `value` is the normalized enum
- for date and datetime facts, `value` is the normalized date or datetime

If future use cases need separate display and query values, a later ADR may add a dedicated `display_value` or `normalized_value` field with migration rules.

## Examples

Entity relation fact:

```yaml
id: fact:iphone-15-pro:uses-chip
type: EntityRelationFact
subject: product:iphone-15-pro
predicate: uses_chip
object: chip:a17-pro
value: A17 Pro
value_type: entity
unit: null
raw_value: A17 Pro chip
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
```

Scalar fact:

```yaml
id: fact:iphone-15-pro:display-size
type: ScalarFact
subject: product:iphone-15-pro
predicate: has_display_size
value: 6.1
value_type: number
unit: inch
raw_value: 6.1-inch display
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:display
```

## Candidate Facts

Candidate facts may contain source wording before normalization is complete.

Candidate intake may accept:

- `raw_value` without normalized `value` when a blocking issue records missing normalization
- unresolved units when an `unnormalized_unit` issue is recorded
- unresolved entity values when entity resolution issues are recorded

Promotion to production requires normalized `value`, valid `value_type`, normalized `unit` when applicable, and source-backed evidence.

## Evidence Relationship

`raw_value` is not a replacement for evidence. A production fact with `raw_value` must still cite evidence. The evidence record remains the authoritative place for source location and verification.

Use `raw_value` for compact extracted wording that helps review, diffing, or display. Use `evidence.quote` to verify the claim against the source.

## Validation Rules

Production fact validation must ensure:

- `value` exists and is normalized for the predicate
- `value_type` matches the predicate
- `unit` is normalized when required
- `object` exists when the predicate requires an entity target
- source refs point to evidence records
- `raw_value`, when present, does not replace evidence

Candidate validation must ensure:

- missing normalized values are tracked with issues
- unnormalized units are tracked with issues
- source wording is preserved through `raw_value`, evidence, or source snapshot context

## Consequences

Benefits:

- Avoids redundant `normalized_value` fields.
- Keeps production facts simple and queryable.
- Preserves source wording through evidence and optional `raw_value`.
- Gives candidate ingestion a clear path from raw extraction to normalized production facts.

Costs:

- Some rendering use cases may later need a separate display field.
- Parsers must normalize values before promotion.
- Review tools must show evidence quotes, not only `raw_value`.

## Follow-up Work

- Update ADR-003 examples and optional fields to include `raw_value`.
- Update ADR-008 validation language for raw and normalized value handling.
- Update ADR-011 fact schema validation language.
- Revisit whether `display_value` is needed after the first ingestion implementation.
