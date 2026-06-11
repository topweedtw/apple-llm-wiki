# ADR-018: Entity Resolution Rules

## Status

Proposed

## Date

2026-06-11

## Context

ADR-002 defines canonical entities and aliases. ADR-008 requires entity
resolution before candidate facts can be published. ADR-011 requires entity
resolution validation before promotion.

The missing decision is how extracted names, aliases, model numbers, marketing
names, and source context should be resolved to canonical entity IDs.

This matters because Apple names can be ambiguous:

- "iPad Pro" may refer to many generations and sizes.
- "MacBook Pro" may refer to a product line, generation, or specific product.
- "Apple TV" may refer to hardware, app, service, or product line.
- model numbers can be region-specific.
- source pages often contain enough context to disambiguate, but snippets may
  not.

Incorrect automatic resolution can attach facts to the wrong product. Ambiguous
resolution must stay in candidate records and review queues.

## Decision

Use a deterministic, scored entity resolution pipeline with conservative
auto-resolution thresholds.

Entity resolution must produce:

- candidate entity ID
- entity type
- score from `0.0` to `1.0`
- match method
- evidence for the match
- ambiguity set when multiple candidates are plausible
- decision: `auto_resolved`, `needs_review`, or `unresolved`

Production promotion requires final entity resolution for the fact subject and
for the object when the predicate requires an entity target.

## Resolution Inputs

Entity resolution may use:

- canonical entity IDs
- canonical names
- aliases
- model numbers
- Apple identifiers
- source URL and Apple support identifiers
- page title
- source scope
- surrounding headings and sections
- extracted generation names
- dates such as announcement, release, or publication date
- product line context
- locale and region
- existing relationships and facts

Raw LLM guesses must not be used as final resolution. LLM output may propose
candidates, but deterministic scoring and review rules still apply.

## Match Priority

Use this priority order:

1. exact canonical entity ID match
2. exact external ID match, such as Apple support ID or model number
3. exact canonical name match within explicit source scope
4. exact alias match within explicit source scope
5. URL, page title, and source metadata match
6. generation or product line context match
7. fuzzy text match
8. LLM-suggested candidate

Higher-priority matches can still require review when the name is ambiguous or
the source scope conflicts with the candidate.

## Scoring

Resolution scores should use these default bands:

- `1.00`: exact canonical entity ID or unique external ID match
- `0.95`: exact canonical name or alias with strong source-scope confirmation
- `0.90`: exact name plus strong generation, date, or URL context
- `0.80`: exact name with weak context, or fuzzy name with strong context
- `0.70`: plausible fuzzy match with partial context
- below `0.70`: unresolved

The implementation may compute a more detailed weighted score, but it must map
to these bands for review decisions.

Suggested signal weights:

- exact canonical ID: hard match
- unique model number or Apple identifier: hard match
- source scope match: high
- page title match: high
- exact alias: medium to high
- generation/date context: medium
- product line context: medium
- fuzzy name similarity: low to medium
- LLM suggestion: supporting signal only

## Auto-Resolution Rules

Auto-resolution is allowed only when all of these conditions are true:

- score is `>= 0.95`
- the top candidate is at least `0.10` higher than the next candidate
- source scope does not conflict with the candidate
- entity type matches the predicate role defined in ADR-021
- no existing fact or relationship creates a same-scope contradiction
- the match method is not LLM-only

Auto-resolution is required to record the signals that justified the decision.

## Review Rules

Resolution must be marked `needs_review` when:

- score is `>= 0.70` and `< 0.95`
- the top two candidates differ by less than `0.10`
- the extracted name is reused across generations
- the candidate type is plausible but not certain
- source scope is missing or weak
- model numbers are region-specific and the fact is locale-sensitive
- LLM suggestion is the main signal
- source context conflicts with an otherwise strong match

Resolution must be marked `unresolved` when:

- score is below `0.70`
- no candidate entity exists
- required disambiguating context is absent
- the candidate appears to be a new entity that must be created first

## Ambiguous Product Names

Ambiguous product-family names must not resolve to a specific product without
source context.

Examples:

- "iPad Pro" alone should resolve to `product-line:ipad-pro` or remain
  ambiguous, depending on whether that product-line entity exists.
- "iPad Pro M4" may resolve to `product-generation:ipad-pro-m4` when the source
  scope and release context support it.
- "11-inch iPad Pro (M4)" may resolve to a specific product or generation,
  depending on the entity model.
- "MacBook Pro" alone should not resolve to a specific yearly model.

If the predicate requires a specific product but the extracted name resolves
only to a product line or generation, the candidate fact must remain in review
or be rewritten to the correct scope.

## Locale and Region

Locale and region can disambiguate model numbers, availability, pricing,
cellular bands, and bundled accessories.

Rules:

- region-specific model numbers should prefer variant entities when the variant
  exists
- locale-specific claims must not force a separate product entity unless ADR-002
  identity rules require it
- if a source locale conflicts with the candidate entity scope, mark the
  resolution `needs_review`

## Candidate Record Fields

Candidate facts should store resolution metadata:

```yaml
entity_resolution:
  subject:
    extracted_name: iPad Pro
    candidate_id: product-generation:ipad-pro-m4
    candidate_type: ProductGeneration
    score: 0.90
    decision: needs_review
    match_method: exact_alias_with_generation_context
    signals:
      - page_title_match
      - generation_context_m4
      - source_scope_ipad
    ambiguity_set:
      - product-line:ipad-pro
      - product-generation:ipad-pro-m4
```

Production facts should store canonical entity IDs, not resolution metadata.
Resolution metadata remains in candidate, review, and audit records.

## Validation

Promotion validation must verify:

- subject resolution decision is `auto_resolved` or reviewer-approved
- object resolution decision is `auto_resolved` or reviewer-approved when object
  is required
- the resolved entity type matches the predicate role registry defined in ADR-021
- ambiguity has been resolved or explicitly accepted by review
- review decisions are recorded for non-auto resolutions

## Consequences

Benefits:

- Reduces wrong fact attachment.
- Makes entity ambiguity visible and reviewable.
- Allows deterministic auto-resolution for high-confidence cases.
- Preserves auditability of resolution decisions.

Costs:

- Requires entity indexes and scoring implementation.
- Requires candidate and review records to store resolution metadata.
- Some useful facts will wait for review instead of being auto-promoted.

## Follow-up Work

- Use ADR-021 as the predicate role registry for subject and object entity type constraints.
- Add entity resolution scoring tests.
- Add fixtures for ambiguous names such as "iPad Pro" and "MacBook Pro".
- Add review UI or CLI output for ambiguity sets and signals.
