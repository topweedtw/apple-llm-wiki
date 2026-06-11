# ADR-014: Ingestion Promotion State Machine

## Status

Proposed

## Date

2026-06-10

## Context

ADR-003, ADR-008, ADR-010, and ADR-011 define candidate facts, validation, review, and promotion. They intentionally prevent incomplete or unsupported claims from entering production facts.

The remaining gap is operational: the allowed states and transitions for candidate sources, candidate facts, issues, review decisions, and production publication need to be explicit enough to implement, test, and audit.

## Decision

Use explicit state machines for candidate sources, candidate facts, and candidate issues. Promotion into production facts is allowed only from an approved candidate fact with all blocking issues resolved.

## Candidate Source States

Allowed candidate source states:

```text
discovered
pending_fetch
fetched
classified
extraction_ready
extraction_failed
ready_for_review
rejected
published
deprecated
```

Default transition path:

```text
discovered
 -> pending_fetch
 -> fetched
 -> classified
 -> extraction_ready
 -> ready_for_review
 -> published
```

Failure or terminal transitions:

```text
pending_fetch -> rejected
extraction_ready -> extraction_failed
ready_for_review -> rejected
published -> deprecated
```

## Candidate Fact States

Allowed candidate fact states:

```text
extracted
intake_valid
needs_review
blocked
approved
rejected
promoted
```

Default transition path:

```text
extracted
 -> intake_valid
 -> needs_review
 -> approved
 -> promoted
```

Blocking transition path:

```text
extracted
 -> intake_valid
 -> blocked
 -> needs_review
 -> approved
 -> promoted
```

Rejected candidates are terminal unless a new candidate is created from a corrected extraction or manual edit.

## Entity Resolution Approval

Entity resolution approval is a sub-decision on a candidate fact, not approval
of the candidate fact itself.

Approving subject or object entity resolution may:

- mark the selected resolution as reviewer-approved
- record reviewer identity, timestamp, and reason when required
- resolve entity-resolution blocking issues
- move a candidate fact from `blocked` to `needs_review` when entity resolution
  was the only blocking issue

Approving entity resolution must not:

- change a candidate fact state directly to `approved`
- promote a candidate fact
- bypass evidence, predicate, unit, freshness, confidence, or conflict checks

Candidate fact approval remains a separate transition from `needs_review` to
`approved`. Promotion remains a separate transition from `approved` to
`promoted`.

## Candidate Issue States

Allowed issue states:

```text
open_blocking
open_non_blocking
resolved
accepted_non_blocking
rejected_candidate
```

Examples of blocking issues:

- missing evidence
- unresolved subject entity
- unresolved object entity when required
- missing value, such as an unknown historical price recorded as `missing_value`
- invalid predicate
- schema mismatch
- invalid locale or time qualifier

Examples of non-blocking issues:

- weak but usable source wording
- optional unit normalization note
- low-priority alias suggestion
- review note for future parser improvement

## Promotion Rules

A candidate fact can be promoted only when:

- candidate fact state is `approved`
- all blocking issues are `resolved`
- any remaining non-blocking issues are `accepted_non_blocking`
- subject entity resolution is final
- object entity resolution is final when the predicate requires an object
- predicate is approved
- value type matches the predicate
- units are normalized when units apply
- locale and time qualifiers are valid
- source refs point to existing evidence records
- freshness and confidence are assigned
- reviewer identity and timestamp are recorded

Promotion creates or updates a production fact and records an audit event.

## Production Fact Restrictions

Production facts must not contain:

- `review_status`
- `needs_review`
- unresolved entity references
- unresolved predicates
- missing evidence references
- candidate-only issue fields

Unknown or unreviewed claims must remain in candidate facts. If a historical value is unknown, use a `candidate-fact:*` record when useful for review workflows. Do not create a production `fact:*` record with `review_status: needs_review`.

## Review Decisions

Review decisions should record:

- reviewer identity
- timestamp
- decision: `approve`, `reject`, `request_changes`, or `accept_non_blocking_issue`
- reason
- changed fields
- previous candidate state
- next candidate state

## Consequences

Benefits:

- Promotion becomes testable and auditable.
- Candidate records can be incomplete without weakening production quality.
- Review UI can show precise next actions.
- ADR-003 and ADR-009 no longer conflict around unknown or unreviewed facts.

Costs:

- Requires state transition validation.
- Requires review and audit tables.
- Manual review workflows need clear UI support.

## Follow-up Work

- Define database constraints for allowed states.
- Define transition validation in ingestion services.
- Add tests for invalid promotion attempts.
