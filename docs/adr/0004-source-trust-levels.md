# ADR-004: Source Trust Levels

## Status

Accepted

## Date

2026-06-10

## Context

The Apple LLM Wiki depends on source-backed facts. Not all sources should be treated equally. Apple official pages, Apple support documents, developer documentation, retailer pages, teardown sites, rumor sites, and community posts can all contain useful information, but they differ in authority, freshness, scope, and risk.

The system needs a source trust model so ingestion, review, conflict handling, ranking, and LLM answers can make consistent decisions.

## Decision

Assign every source a `trust_level`, `source_type`, `scope`, and review status.

Trust level is not the same as freshness. A high-trust official page can still be stale for current pricing. A lower-trust secondary source can still be useful for repairability or teardown details when clearly labeled.

## Trust Levels

### `official_primary`

Official Apple source that directly states the claim.

Examples:

- Apple technical specifications
- Apple Newsroom announcement
- Apple Support compatibility article
- Apple Developer documentation

Use for canonical product specs, launch dates, OS support, compatibility, and official policy.

### `official_secondary`

Official Apple source that indirectly supports the claim or is not the canonical page for that claim.

Examples:

- Apple Store pages
- Apple marketing pages
- Apple press images or product copy

Use when no better official primary source is available, or as additional evidence.

### `official_archived`

Archived Apple source where the original content was published by Apple but is no longer available at the live URL, or where the archived version is needed to preserve historical context.

Examples:

- Apple pages captured through the Wayback Machine
- archived Apple technical specification pages
- archived Apple product pages
- archived Apple support or marketing pages

Use for historical facts, launch-era specifications, discontinued product information, and original product context. Do not use archived official sources as evidence for current sales status, current support status, current pricing, or current availability.

### `trusted_secondary`

Established third-party source with strong editorial standards or specialized data.

Examples:

- iFixit
- EveryMac
- MacRumors Buyer's Guide
- reputable standards bodies or regulatory databases

Use for teardown details, repairability, historical model metadata, buyer timing, or non-official analysis. Label clearly in answers.

### `retailer_or_carrier`

Retailer, carrier, or reseller source.

Use for regional availability, pricing, bundles, promotions, or carrier-specific variants. These sources are highly time-sensitive.

### `community`

Community-maintained source.

Examples:

- forums
- wikis
- GitHub repositories
- Reddit posts

Use only as supporting or discovery evidence unless manually verified.

### `unknown`

Source has not been classified or reviewed.

Claims from unknown sources should remain as candidate facts with `review_status: needs_review` and should not be promoted to production facts or used for confident LLM answers until reviewed.

## Source Record Fields

```yaml
id: source:apple-tech-specs-iphone-15-pro
title: iPhone 15 Pro - Technical Specifications
url: https://support.apple.com/kb/SP903
publisher: Apple
source_type: technical_specification
trust_level: official_primary
scope:
  products:
    - product:iphone-15-pro
  locales:
    - en-US
published_at: 2023-09-12
fetched_at: 2026-06-10
last_verified_at: 2026-06-10
review_status: reviewed
checksum: null
notes: null
```

## Review Status

Allowed values:

- `unreviewed`
- `reviewed`
- `needs_review`
- `deprecated`
- `blocked`

Review status describes whether the source is approved for use. Trust level describes source authority.

## Ranking Rules

When multiple facts compete for an answer:

1. Prefer sources with more specific scope.
2. Prefer `official_primary` over other trust levels.
3. Prefer `official_archived` for historical claims when the live official source is unavailable or has changed.
4. Do not use `official_archived` for current-status claims when live sources exist or current verification is required.
5. Prefer newer verification for time-sensitive claims.
6. Prefer locale-matching sources for locale-specific questions.
7. Prefer reviewed sources over unreviewed sources.
8. Preserve conflicting lower-ranked sources for audit.

## Conflict Handling

If sources disagree, do not silently overwrite facts.

- Same scope and same time range: mark facts as `disputed`.
- Different locale or region: keep separate facts.
- Different time range: use `valid_from` and `valid_to`.
- Official source versus secondary source: rank official higher, but retain secondary evidence if useful.
- Live official source versus archived official source: use the live source for current claims and the archived source for historical claims.

## Consequences

Benefits:

- LLM answers can explain source authority.
- Ingestion can prioritize review work.
- Conflict handling becomes consistent.
- Secondary sources remain useful without being confused with official claims.

Costs:

- Every source needs classification.
- Some sources may change role depending on claim type.
- Trust levels require periodic audit.

## Alternatives Considered

### Binary Trusted / Untrusted

Rejected because many sources are useful in specific domains but not canonical for all claims.

### Official Sources Only

Rejected because Apple official sources do not cover every useful detail, especially teardown, historical, retailer, or repairability data.

## Follow-up Work

- Define automated source classification rules.
- Add review workflow for unknown and community sources.
- Add source ranking to retrieval in ADR-005.
