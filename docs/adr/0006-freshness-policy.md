# ADR-006: Freshness Policy

## Status

Proposed

## Date

2026-06-10

## Context

Some Apple facts are historical and stable. Others change frequently. Release dates and chip names rarely change after verification, but current price, sales status, repair status, software support, and availability can change at any time.

LLM answers must know whether a fact is current, historical, stale, disputed, or awaiting review.

## Decision

Track freshness independently for facts, sources, and pages.

Freshness is a review and validity signal. It is not the same as confidence, trust level, or source authority.

## Freshness States

Allowed production fact freshness values:

- `current`
- `possibly_stale`
- `historical`
- `deprecated`
- `disputed`

`needs_review` is not a production fact freshness value. It belongs to candidate records and review queues.

### `current`

The fact was recently verified and is expected to describe the current state.

Use for current sales status, current OS support, active pricing, and current compatibility when recently checked.

### `possibly_stale`

The fact may have changed and needs verification before confident use.

Use when a TTL has expired or when the question asks for current status but the last verification is old.

### `historical`

The fact describes a past event or stable historical property.

Use for announcement dates, original release dates, historical specs, and discontinued product history.

### `deprecated`

The fact should no longer be used for new answers except as history.

Use when a newer fact supersedes it or when a source is retired.

### `disputed`

Sources conflict for the same scope and time range.

Use when the system should surface uncertainty.

## Freshness TTLs

Default review intervals:

- Current price: 7 days
- Sales status: 14 days
- Trade-in value: 7 days
- OS support status: 30 days
- Compatibility: 90 days
- Repair, vintage, or obsolete status: 30 days
- Product specs after launch: 365 days
- Announcement and release dates: no TTL after review

TTL expiration should change `current` to `possibly_stale`, not delete the fact.

## Predicate TTL Mapping

Freshness jobs should use this default predicate-to-TTL mapping. `none` means no
scheduled TTL expiration after the fact has been reviewed, though source
checksum changes or conflicts may still trigger review.

| Predicate | Default TTL | Notes |
| --- | ---: | --- |
| `has_price` | 7 days | Region-specific money facts must include locale or region. |
| `has_sales_status` | 14 days | Current availability and sales status are time-sensitive. |
| `has_trade_in_value` | 7 days | Add to predicate registry before production use. |
| `has_support_status` | 30 days | Includes support, repair, vintage, and obsolete status. |
| `supports_os` | 30 days | Current OS support can change with OS releases. |
| `compatible_with` | 90 days | Accessory, OS, and feature compatibility. |
| `requires` | 90 days | Requirements may change with OS or support updates. |
| `has_display_size` | 365 days | Stable spec after launch review. |
| `has_weight` | 365 days | Stable spec after launch review. |
| `uses_chip` | none | Historical hardware relation after review. |
| `has_feature` | none | Historical feature relation after review, unless source conflict appears. |
| `introduced_at` | none | Event relation after review. |
| `has_announcement_date` | none | Stable historical date after review. |
| `has_release_date` | none | Stable historical date after review. |
| `belongs_to_line` | none | Identity relationship after review. |
| `belongs_to_generation` | none | Identity relationship after review. |
| `has_variant` | none | Identity relationship after review. |
| `variant_of` | none | Identity relationship after review. |
| `replaced_by` | none | Historical lifecycle relation after review. |
| `replaces` | none | Historical lifecycle relation after review. |
| `runs_os` | none | Launch or bundled OS relation after review. |
| `first_generation_with_feature` | none | Derived fact; regenerate when dependencies change. |

Predicates not listed here must define a TTL policy before production use, or
remain in review.

## Review Triggers

Recheck freshness when:

- Apple announces new products.
- Apple releases major OS versions.
- Apple updates support pages.
- A source checksum changes.
- A conflict is detected.
- A user asks a current-status question.
- A fact is used in a buying recommendation.

## Source Freshness

Sources should track:

```yaml
fetched_at: 2026-06-10
last_verified_at: 2026-06-10
content_changed_at: null
checksum: null
freshness: current
```

If a source changes, facts derived from it should be revalidated.

## Page Freshness

Wiki pages should inherit freshness from their facts.

Rules:

- If any cited fact is `disputed`, the page should show disputed content.
- If buying advice uses `possibly_stale` facts, the page should be `possibly_stale`.
- Historical pages can remain `historical` when all claims are stable.

## Answer Behavior

When answering current questions, the LLM must:

- Prefer `current` facts.
- Warn when only `possibly_stale` facts are available.
- Ignore candidate records that have not been promoted to production facts.
- Explain `disputed` facts.
- Use exact verification dates when helpful.

## Consequences

Benefits:

- Reduces stale answers.
- Keeps historical facts useful.
- Makes review work visible.
- Supports reliable buying guidance.

Costs:

- Requires periodic refresh jobs.
- Requires TTL configuration by fact type.
- Some candidate records may remain unavailable for answers until reviewed and promoted.

## Alternatives Considered

### Single Last Updated Timestamp

Rejected because one timestamp cannot distinguish current, historical, disputed, and review-pending claims.

### Always Re-fetch Live Sources

Rejected because it is slower, more expensive, and still needs interpretation and review.

## Follow-up Work

- Implement scheduled freshness checks.
- Add source checksum tracking.
- Define freshness dashboards and review queues.
