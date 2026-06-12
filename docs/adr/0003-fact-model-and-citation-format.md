# ADR-003: Fact Model and Citation Format

## Status

Accepted

## Date

2026-06-10

## Context

ADR-001 defines the Apple LLM Wiki as a source-grounded knowledge base. ADR-002 defines stable entities for products, chips, operating systems, features, events, accessories, support policies, and compatibility rules.

The next decision is how to represent source-backed facts and citations. This is the most important layer for LLM reliability because the model should answer from verifiable claims, not from unsourced prose or loose semantic matches.

Apple product knowledge contains many different kinds of claims:

- Static claims, such as a product's announcement date.
- Structured specifications, such as display size, chip, storage, ports, weight, or camera system.
- Time-sensitive claims, such as current availability, price, trade-in value, or support status.
- Locale-specific claims, such as regional model numbers, cellular bands, pricing, or included accessories.
- Derived claims, such as "first iPhone with USB-C" or "newer than iPhone 14 Pro".
- Compatibility claims, such as accessory support or OS support.
- Conflicting claims, especially when official pages, support pages, and secondary sources disagree.

The fact model must support exact lookup, comparison, graph traversal, source citation, freshness checks, and conflict handling.

## Decision

Represent knowledge as atomic, source-backed facts.

A fact is a single claim about one or more entities. Facts must be traceable to evidence. Facts may be time-bounded, locale-bounded, confidence-scored, and marked with freshness state.

Facts are not wiki paragraphs. Facts are normalized records that can be queried, compared, cited, and revised.

The system must distinguish production facts from candidate facts:

- `candidate_facts` are staging records produced by crawling, parsing, LLM-assisted extraction, or manual entry. They may be incomplete while awaiting review.
- production `facts` are accepted knowledge-base records. They must have `source_refs` that point to evidence records.

Incomplete or unreviewed claims must stay in `candidate_facts` or a review queue. They must not be inserted into the production `facts` table.

## Candidate and Promotion Rules

The fact pipeline must follow these rules:

- LLM and parser extraction output always enters `candidate_facts` first.
- `candidate_facts` may be missing evidence, entity resolution, or normalized units while under review.
- Every incomplete `candidate_fact` must record `issues` that explain what is missing or invalid.
- Only candidate facts that pass validation may be promoted into production `facts`.
- Production `facts.source_refs` is required.
- Every production `source_ref` must point to an existing evidence record.
- `needs_review` must not be used as a production fact state to bypass schema requirements.
- The candidate fact state field is named `state` and uses the ADR-014 candidate fact state values. `review_status` is a source-record field defined in ADR-004, not a fact field.
- A claim without evidence can only remain in `candidate_facts` or be rejected. It cannot enter production `facts`.

Example candidate fact:

```yaml
id: candidate-fact:iphone-15-pro:uses-chip:extract-001
candidate_subject: iPhone 15 Pro
candidate_predicate: uses_chip
candidate_value: A17 Pro
source_id: source:apple-tech-specs-iphone-15-pro
evidence_refs: []
entity_resolution: null
normalized_unit: null
issues:
  - missing_evidence
  - unresolved_subject_entity
state: needs_review
```

## Fact Identity

Fact IDs use this format:

```text
fact:<subject-slug>:<predicate>[:<qualifier>]
```

Examples:

```text
fact:iphone-15-pro:uses-chip
fact:iphone-15-pro:display-size
fact:iphone-15-pro:release-date:us
fact:apple-pencil-pro:compatible-with:ipad-pro-m4
```

Rules:

- Fact IDs should be stable when the meaning of the fact is stable.
- Fact IDs should not include mutable values.
- Locale, region, or configuration can appear as a qualifier when needed.
- If a claim changes over time, keep the identity stable and update validity metadata or create a replacement fact.

## Base Production Fact Fields

Every production fact should support these fields:

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
qualifiers: {}
valid_from: 2023-09-12
valid_to: null
locale: global
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
confidence: high
freshness: historical
created_at: 2026-06-10
updated_at: 2026-06-10
last_verified_at: 2026-06-10
```

Required production fact fields:

- `id`
- `type`
- `subject`
- `predicate`
- `value`
- `value_type`
- `source_refs`
- `confidence`
- `freshness`
- `created_at`
- `updated_at`

Each `source_refs` entry must reference an existing source and evidence record.

Optional fields:

- `object`
- `unit`
- `raw_value`
- `qualifiers`
- `valid_from`
- `valid_to`
- `locale`
- `last_verified_at`
- `supersedes`
- `superseded_by`
- `conflicts_with`
- `derived_from` (derived facts only)
- `notes`

## Fact Types

### EntityRelationFact

Represents a relationship between entities.

Example:

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
```

### ScalarFact

Represents a number, string, date, boolean, or enumerated value.

Example:

```yaml
id: fact:iphone-15-pro:display-size
type: ScalarFact
subject: product:iphone-15-pro
predicate: has_display_size
value: 6.1
value_type: number
unit: inch
raw_value: 6.1-inch display
```

### TemporalFact

Represents a claim that is explicitly valid during a time range.

Example:

```yaml
id: fact:iphone-15-pro:sales-status:us
type: TemporalFact
subject: product:iphone-15-pro
predicate: has_sales_status
value: discontinued
value_type: enum
valid_from: 2024-09-09
valid_to: null
locale: en-US
```

### CompatibilityFact

Represents a compatibility claim between entities.

Example:

```yaml
id: fact:apple-pencil-pro:compatible-with:ipad-pro-m4
type: CompatibilityFact
subject: accessory:apple-pencil-pro
predicate: compatible_with
object: product-generation:ipad-pro-m4
value: compatible
value_type: enum
qualifiers:
  requires_os: os:ipados-17-5
```

### DerivedFact

Represents a fact inferred from other facts.

Example:

```yaml
id: fact:iphone-15-series:first-iphone-generation-with-usb-c
type: DerivedFact
subject: product-generation:iphone-15-series
predicate: first_generation_with_feature
object: feature:usb-c
value: true
value_type: boolean
derived_from:
  - fact:iphone-15:has-feature:usb-c
  - fact:iphone-14:has-feature:lightning
```

Derived facts must cite their input facts and should be regenerated when dependencies change.

## Predicates

Predicates should be normalized snake_case verbs or verb phrases.

Examples:

- `belongs_to_line`
- `belongs_to_generation`
- `has_variant`
- `variant_of`
- `uses_chip`
- `has_feature`
- `has_display_size`
- `has_weight`
- `has_release_date`
- `has_sales_status`
- `supports_os`
- `compatible_with`
- `requires`
- `introduced_at`
- `replaced_by`

Predicate definitions should use the predicate role registry defined in ADR-021 so ingestion, retrieval, entity resolution, and UI rendering use the same semantics.

## Value Types

Allowed `value_type` values:

- `entity`
- `string`
- `number`
- `integer`
- `boolean`
- `date`
- `datetime`
- `enum`
- `list`
- `range`
- `money`

`value` should be normalized when possible and should be queryable according to `value_type`. Units must use the unit registry defined in ADR-020. Source wording should be preserved in `evidence.quote`; optional `raw_value` may store a concise extracted phrase for review, diffing, or display, but it is not a replacement for evidence.

Do not introduce a separate `normalized_value` field unless a later ADR defines a migration and use case. For entity relation facts, `object` is the normalized entity reference. For scalar facts, `value` plus `unit` is the normalized representation.

## Evidence Model

A citation should point to evidence, not only to a source document.

Evidence records identify the exact source location that supports a fact.

```yaml
id: evidence:apple-tech-specs-iphone-15-pro:chip
source_id: source:apple-tech-specs-iphone-15-pro
locator:
  type: section
  value: Chip
quote: A17 Pro chip
retrieved_at: 2026-06-10
```

Allowed locator types:

- `section`
- `heading`
- `css_selector`
- `text_anchor`
- `timestamp`
- `page`
- `table`
- `row`
- `manual_note`

Quotes should be short and only long enough to verify the claim.

Evidence quotes must not exceed 300 characters, counted as Unicode characters
to support multi-locale source content. A candidate fact whose quote exceeds the
limit records a blocking `evidence_quote_too_long` issue and cannot be promoted
until the quote is shortened or the issue is explicitly accepted in review. When
the locator type is `table`, `row`, or a cell-level locator, the quote should
contain only the relevant cell or row value, not the full table.

## Citation Format

Internal citation format:

```text
[source:<source_id>#<evidence_id>]
```

Example:

```text
[source:apple-tech-specs-iphone-15-pro#evidence:apple-tech-specs-iphone-15-pro:chip]
```

Human-facing citations should render as source titles, URLs, and retrieval dates.

Example:

```text
Apple Technical Specifications: iPhone 15 Pro, retrieved 2026-06-10.
```

LLM answers should cite facts through evidence-backed source references, not by inventing prose references.

## Confidence

Allowed confidence values:

- `high`
- `medium`
- `low`
- `unknown`

Guidelines:

- Use `high` for direct official source evidence.
- Use `medium` for reliable secondary sources or indirect official evidence.
- Use `low` for weak, inferred, or partially supported claims.
- Use `unknown` only for candidate facts or imported records that have not yet been reviewed.

Production facts should normally use `high`, `medium`, or `low`; unreviewed data should stay outside the production `facts` table.

Confidence is not freshness. A fact can be high-confidence and stale.

## Freshness

Allowed freshness values:

- `current`
- `possibly_stale`
- `deprecated`
- `historical`
- `disputed`

Freshness should be updated independently from confidence.

`needs_review` is a review status for candidate facts, not a production fact freshness value.

Examples:

- Announcement date is usually `historical`.
- Current sales status may be `current` or `possibly_stale`.
- A claim with conflicting sources should be `disputed`.
- An imported claim without review should remain in `candidate_facts` in state `needs_review`.

## Locale and Region

Facts are global by default.

Use `locale` or qualifiers when a claim is region-specific.

Example:

```yaml
id: fact:iphone-15-pro:release-date:us
subject: product:iphone-15-pro
predicate: has_release_date
value: 2023-09-22
value_type: date
locale: en-US
```

Prices, availability, cellular bands, regulatory behavior, and bundled accessories often need locale or region qualifiers.

## Conflict Handling

Do not overwrite conflicting facts silently.

When sources disagree:

- Keep both facts if they represent different scopes, locales, or time ranges.
- Mark facts as `disputed` if they claim the same scope and conflict.
- Link conflicting facts with `conflicts_with`.
- Prefer official sources in answer ranking, but preserve secondary sources for audit and explanation.

Example:

```yaml
conflicts_with:
  - fact:iphone-example:weight:secondary-source
freshness: disputed
```

## Update and Supersession

Facts should be versioned through metadata rather than destructive replacement.

When a fact changes:

- Update `valid_to` on the old fact when the old claim was true for a time range.
- Create a new fact if the new claim has a distinct scope or validity period.
- Use `supersedes` and `superseded_by` when a new fact replaces an old interpretation.
- Keep source references for both old and new facts.

## Consequences

Benefits:

- LLM answers can cite exact evidence.
- Structured facts support precise comparison and filtering.
- Temporal and locale fields reduce stale or overgeneralized answers.
- Confidence and freshness are separated, which improves ranking and review workflows.
- Conflicts can be represented without losing auditability.

Costs:

- Ingestion must extract evidence, not only values.
- Predicate and unit normalization require discipline.
- Derived facts need dependency tracking.
- More metadata is required before a fact is ready for production use.

## Alternatives Considered

### Store Claims as Wiki Paragraphs

Rejected because paragraphs are hard to compare, validate, cite precisely, and update safely.

### Cite Only Source URLs

Rejected because a URL does not identify the exact evidence for a claim. Evidence-level citation is needed for reliable LLM answers.

### Treat Facts as Immutable Forever

Rejected because many Apple facts are time-sensitive or locale-specific. The model must support validity ranges and supersession.

## Follow-up Work

- Define source trust levels in ADR-004.
- Use ADR-021 for predicate role constraints and ADR-020 for unit normalization.
- Define ingestion validation rules.
- Define how facts are rendered in wiki pages and LLM answers.
