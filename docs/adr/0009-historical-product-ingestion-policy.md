# ADR-009: Historical Product Ingestion Policy

## Status

Accepted

## Date

2026-06-10

## Context

Apple's current store pages usually focus on products that are actively sold. A complete Apple LLM Wiki must also include historical and discontinued products, because many useful questions involve older iPhones, iPads, Macs, Apple Watches, AirPods, accessories, operating systems, chips, and support status.

Historical product data cannot rely only on current Apple Store pages. It needs a separate ingestion policy that distinguishes original historical facts from current status facts.

## Decision

Use a dedicated historical ingestion path for old or discontinued Apple products.

Historical products should be added from official historical sources first, archived official sources second, and trusted secondary sources when official data is missing or incomplete. Historical specifications should be marked as `historical`. Current support, repair, sales, and software status should be modeled as separate current or freshness-sensitive facts.

## Source Priority

Use this source order for historical products:

1. Apple official technical specification pages
2. Apple Support model identification pages
3. Apple Newsroom launch announcements
4. Apple Developer documentation
5. Apple event videos or transcripts
6. Apple archived pages or official pages available through web archives
7. Trusted secondary sources such as EveryMac, iFixit, or MacRumors Buyer's Guide
8. Retailer, carrier, regulatory, or repair sources
9. Community sources for discovery only

When a source is archived but originally from Apple, mark it separately from live official pages.

Example:

```yaml
trust_level: official_archived
source_type: archived_official_page
freshness: historical
```

## Historical Facts vs Current Status Facts

Do not mix original product history with current status.

Historical facts describe what was true at launch or during the product's lifecycle:

- announcement date
- original release date
- original price
- original specifications
- included chip
- launch operating system
- model identifiers
- product generation
- original compatibility

Current status facts describe what is true now:

- current sales status
- vintage or obsolete status
- repair availability
- latest supported operating system
- security update eligibility
- current accessory or service compatibility

Example historical fact:

```yaml
id: fact:iphone-6:release-date
subject: product:iphone-6
predicate: has_release_date
value: 2014-09-19
value_type: date
freshness: historical
```

Example current status fact:

```yaml
id: fact:iphone-6:support-status
subject: product:iphone-6
predicate: has_support_status
value: obsolete
value_type: enum
freshness: current
last_verified_at: 2026-06-10
```

## Entity Creation for Historical Products

Historical products should use the same entity schema defined in ADR-002.

Required minimum fields:

- `id`
- `type`
- `canonical_name`
- `status`
- `aliases`
- `first_seen_at`
- `source_ids`

Use `status: historical` for discontinued products whose identity is stable.

Example:

```yaml
id: product:iphone-6
type: Product
canonical_name: iPhone 6
status: historical
aliases:
  - iPhone 6
external_ids:
  model_numbers:
    - A1549
    - A1586
    - A1589
first_seen_at: 2014-09-09
source_ids:
  - source:apple-newsroom-iphone-6
```

## Archived Official Sources

Archived official sources are useful when Apple no longer hosts the original page or when the live page has changed.

Rules:

- Preserve the original URL when known.
- Record the archive URL separately.
- Record the archive timestamp.
- Mark the source as `official_archived`, not `official_primary`.
- Use archived evidence for historical facts, not current status facts.
- Prefer live Apple Support pages when answering current support questions.

Example:

```yaml
source:
  id: source:apple-archived-iphone-6-tech-specs
  original_url: https://www.apple.com/iphone-6/specs/
  archive_url: https://web.archive.org/...
  publisher: Apple
  trust_level: official_archived
  source_type: archived_official_page
  fetched_at: 2026-06-10
```

## Trusted Secondary Sources

Trusted secondary sources may be used when official sources are missing, incomplete, or hard to parse.

Recommended use:

- EveryMac for historical Mac identifiers and specs
- iFixit for teardown, repairability, and internal components
- MacRumors Buyer's Guide for lifecycle and buyer timing context
- regulatory databases for model and wireless details

Secondary-source facts must be labeled and should not override direct official evidence unless the official source is absent or ambiguous.

## Unknown or Missing Data

Do not invent missing historical details.

If a value is unknown:

- leave the production fact absent, or
- create an explicit `unknown` candidate fact only when useful for review workflows, and
- keep it in `candidate_facts` with candidate state `needs_review` and explicit issues.

Original launch prices use the `has_price` predicate with `valid_from` and
`valid_to` validity bounds. There is no separate `has_original_price`
predicate in the ADR-021 registry.

Example:

```yaml
id: candidate-fact:old-product:price:unknown
predicate: has_price
value: unknown
state: needs_review
issues:
  - missing_value
```

## Review Rules

Historical ingestion review must check:

- whether the product identity is correct
- whether model identifiers map to the correct region or variant
- whether facts describe original state or current state
- whether archived evidence is from an official Apple source
- whether secondary sources conflict with official evidence
- whether locale-specific facts are scoped correctly

## Answer Behavior

When answering about old products:

- Use `historical` facts for original specs and launch history.
- Use `current` facts for support, repair, availability, and OS status.
- Warn when current status facts are `possibly_stale`.
- Label secondary-source claims clearly.
- Do not assume discontinued means obsolete or unsupported.

## Consequences

Benefits:

- Old products can be represented without relying on current Apple Store pages.
- Original product history is separated from current support status.
- Archived Apple sources remain useful while being clearly labeled.
- Trusted secondary sources can fill gaps without becoming indistinguishable from official claims.

Costs:

- Historical ingestion requires more source discovery.
- Archived sources need extra metadata.
- Some old products may remain partially incomplete until reviewed.

## Alternatives Considered

### Only Include Currently Sold Products

Rejected because it would make the wiki incomplete and weak for historical comparison, repair, resale, and support questions.

### Treat Archived Apple Pages as Current Official Sources

Rejected because archived pages are useful for history but should not be used as current-status evidence.

### Use Secondary Sources as Canonical History

Rejected because secondary sources are valuable but should not outrank direct official evidence.

## Follow-up Work

- Define archive source metadata fields.
- Build historical product discovery query templates.
- Create review checklist for old product ingestion.
