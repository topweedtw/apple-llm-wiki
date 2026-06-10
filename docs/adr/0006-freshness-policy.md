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

Allowed values:

- `current`
- `possibly_stale`
- `historical`
- `deprecated`
- `disputed`
- `needs_review`

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

### `needs_review`

The fact has been imported or generated but has not been approved.

Use for unreviewed ingestion output, low-confidence extraction, or unknown sources.

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
- Avoid confident answers from `needs_review` facts.
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
- Some facts may be temporarily downgraded until reviewed.

## Alternatives Considered

### Single Last Updated Timestamp

Rejected because one timestamp cannot distinguish current, historical, disputed, and unreviewed claims.

### Always Re-fetch Live Sources

Rejected because it is slower, more expensive, and still needs interpretation and review.

## Follow-up Work

- Implement scheduled freshness checks.
- Add source checksum tracking.
- Define freshness dashboards and review queues.
