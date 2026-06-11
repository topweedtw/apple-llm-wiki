# ADR-019: Review Interface and Operations

## Status

Accepted

## Date

2026-06-11

## Context

ADR-014 defines the candidate and promotion state machine. ADR-018 defines
entity resolution decisions. The implementation plan says review should start
with CLI/admin commands and move to a web UI later.

The missing decision is how humans perform review work:

- which operations must exist in CLI first
- which operations should not be CLI-only forever
- what information a reviewer must see
- what audit records each decision must write
- when the project should build a web review UI

Review is a safety boundary. If review operations are unclear, the system may
promote unsupported facts, accept ambiguous entity resolution, or lose the audit
trail required by the ADR set.

## Decision

Start with CLI/admin review commands for the first vertical slice. Defer a web
review UI until review volume, ambiguity, or collaboration needs justify it.

The CLI must support all required review decisions for ingestion MVP. The web UI
must be introduced when review work becomes too visual, high-volume, or
multi-user for safe CLI operation.

## CLI-First Review Scope

The first implementation must support these CLI/admin operations:

- list candidate sources by state
- show candidate source details, snapshot metadata, and classification
- approve or reject candidate sources
- list candidate facts by state, source, entity, predicate, issue, or freshness
- show candidate fact details
- show evidence locator and quote
- show source snapshot context around the evidence
- show entity resolution candidates, scores, signals, and ambiguity set
- approve entity resolution
- reject entity resolution
- choose a different canonical entity from the ambiguity set
- mark candidate issues resolved
- accept non-blocking issues
- reject candidate facts
- approve candidate facts
- promote approved candidate facts
- show promotion blockers
- show review decision history

CLI commands must require explicit candidate IDs or review IDs for mutating
operations. Bulk mutation is not allowed in the first vertical slice unless a
dry-run summary is shown and explicitly confirmed.

## Reviewer Context Requirements

Before approving a candidate fact, the review interface must show:

- candidate fact ID
- source ID, title, URL, trust level, locale, and fetched timestamp
- source snapshot checksum
- predicate and proposed value
- raw source wording or `raw_value` when present
- evidence ID, locator, and quote
- subject and object entity resolution status
- entity resolution score, match method, signals, and ambiguity set
- candidate issues and issue states
- freshness and confidence proposal
- conflicting or overlapping production facts
- proposed production fact preview

Approving without this context is not allowed.

## Review Decisions

Every mutating review operation must write a review decision record.

Review decision records must include:

- reviewer identity
- timestamp
- operation
- target type and target ID
- previous state
- next state
- reason
- changed fields
- related issue IDs
- related entity resolution metadata when applicable

Reasons are required for:

- rejecting candidate sources
- rejecting candidate facts
- accepting non-blocking issues
- approving entity resolution below the auto-resolution threshold
- overriding the top entity resolution candidate
- promoting a candidate with any accepted non-blocking issue

## Reviewer Identity

Every review decision record requires a reviewer identity. For the CLI-first
phase, identity is supplied by the operator:

- mutating review commands resolve the reviewer ID from a `--reviewer <id>`
  option, or from a `REVIEWER_ID` environment variable when the option is
  absent
- a mutating command must fail with a structured error when no reviewer ID is
  available
- the resolved reviewer ID is written into every review decision record
- read-only commands do not require a reviewer ID

The first vertical slice does not implement authentication. The supplied
reviewer ID is trusted operator input, which is acceptable while review runs on
a single trusted machine. A web review UI must replace this with real
authentication before multi-user review, and must keep writing the same
reviewer identity field.

## CLI Commands

Initial command groups:

```text
review source list
review source show <candidate_source_id>
review source approve <candidate_source_id>
review source reject <candidate_source_id> --reason <text>

review fact list
review fact show <candidate_fact_id>
review fact approve <candidate_fact_id>
review fact reject <candidate_fact_id> --reason <text>

review issue resolve <issue_id>
review issue accept-non-blocking <issue_id> --reason <text>

review entity show <candidate_fact_id>
review entity approve <candidate_fact_id> --subject|--object
review entity choose <candidate_fact_id> --subject|--object --entity <entity_id> --reason <text>

fact promote <candidate_fact_id>
```

Command names may change during implementation, but the operation coverage must
remain.

## Entity Resolution Approval Flow

`review entity approve` and `review entity choose` approve only the entity
resolution sub-decision for the selected subject or object.

They do not approve the candidate fact. After entity resolution is approved, the
reviewer must still run `review fact approve` when all candidate fact review
requirements are satisfied. After fact approval, promotion remains a separate
`fact promote` operation.

The flow is:

```text
review entity approve/choose
 -> resolve entity-resolution issue
 -> candidate fact remains needs_review, or moves from blocked to needs_review
 -> review fact approve
 -> fact promote
```

If entity resolution was the only blocking issue, approving it may unblock the
candidate fact, but it must not skip fact approval.

## CLI Output Contract

Review CLI commands must support two output modes:

- default human-readable output for interactive review
- `--json` output for scripts, tests, and future UI integration

The `--json` output is a stable contract. Human-readable output may change for
clarity, but it must include the same safety-critical fields.

### List Output

List commands must show enough information for reviewers to choose the next
item without hiding blockers.

Human-readable list output should include:

```text
ID                         STATE         PREDICATE          ENTITY/ SOURCE        BLOCKERS  UPDATED
candidate-fact:...         needs_review  uses_chip          product:iphone-15-pro 2         2026-06-11
```

JSON list output:

```json
{
  "items": [
    {
      "id": "candidate-fact:iphone-15-pro:uses-chip:extract-001",
      "state": "needs_review",
      "predicate": "uses_chip",
      "source_id": "source:apple-tech-specs-iphone-15-pro",
      "subject_candidate_id": "product:iphone-15-pro",
      "blocking_issue_count": 0,
      "non_blocking_issue_count": 1,
      "updated_at": "2026-06-11T10:00:00Z"
    }
  ],
  "next_cursor": null
}
```

### Candidate Fact Detail Output

`review fact show` must render a review packet with all context required for a
safe approval decision.

Required sections:

- candidate summary
- source summary
- snapshot summary
- proposed fact
- evidence
- entity resolution
- issues
- conflicts and overlaps
- promotion preview
- allowed next actions
- review history

JSON detail output:

```json
{
  "candidate_fact": {
    "id": "candidate-fact:iphone-15-pro:uses-chip:extract-001",
    "state": "needs_review",
    "predicate": "uses_chip",
    "value": "A17 Pro",
    "value_type": "entity",
    "unit": null,
    "raw_value": "A17 Pro chip"
  },
  "source": {
    "id": "source:apple-tech-specs-iphone-15-pro",
    "title": "iPhone 15 Pro - Technical Specifications",
    "url": "https://support.apple.com/kb/SP903",
    "trust_level": "official_primary",
    "locale": "en-US",
    "fetched_at": "2026-06-11T10:00:00Z"
  },
  "snapshot": {
    "checksum": "sha256:...",
    "parser_version": "tech-spec-parser@0.1.0"
  },
  "evidence": [
    {
      "id": "evidence:apple-tech-specs-iphone-15-pro:chip",
      "locator": {
        "type": "section",
        "value": "Chip"
      },
      "quote": "A17 Pro chip",
      "context": "Chip: A17 Pro chip"
    }
  ],
  "entity_resolution": {
    "subject": {
      "candidate_id": "product:iphone-15-pro",
      "score": 1.0,
      "decision": "auto_resolved",
      "signals": ["exact_canonical_name", "source_scope_match"],
      "ambiguity_set": []
    },
    "object": {
      "candidate_id": "chip:a17-pro",
      "score": 0.95,
      "decision": "auto_resolved",
      "signals": ["exact_alias", "predicate_role_match"],
      "ambiguity_set": []
    }
  },
  "issues": [],
  "conflicts": [],
  "promotion_preview": {
    "fact_id": "fact:iphone-15-pro:uses-chip",
    "would_emit_outbox_events": ["fact.promoted"]
  },
  "allowed_actions": ["review fact approve", "review fact reject"],
  "review_history": []
}
```

### Entity Resolution Output

`review entity show` must show the top candidate, score, threshold result,
signals, and ambiguity set.

Human-readable output must clearly mark whether the result is:

- eligible for auto-resolution
- needs human review
- unresolved
- blocked by predicate role mismatch

### Mutation Output

Mutating commands must print the decision record ID and final state.

Example:

```text
review_decision: review-decision:2026-06-11:000123
target: candidate-fact:iphone-15-pro:uses-chip:extract-001
operation: approve
previous_state: needs_review
next_state: approved
```

JSON mutation output:

```json
{
  "review_decision_id": "review-decision:2026-06-11:000123",
  "target_id": "candidate-fact:iphone-15-pro:uses-chip:extract-001",
  "operation": "approve",
  "previous_state": "needs_review",
  "next_state": "approved"
}
```

### Dry-Run Output

Any bulk-capable or promotion command must support `--dry-run`.

Dry-run output must show:

- target IDs
- proposed state changes
- blockers
- outbox events that would be emitted
- whether the command is safe to run without changes

### Error Output

Errors must be structured and actionable.

JSON error output:

```json
{
  "error": {
    "code": "promotion_blocked",
    "message": "Candidate fact has unresolved blocking issues.",
    "target_id": "candidate-fact:iphone-15-pro:uses-chip:extract-001",
    "blockers": [
      {
        "issue_id": "candidate-issue:missing-evidence",
        "state": "open_blocking"
      }
    ]
  }
}
```

Human-readable errors must include the error code, target ID, blockers, and the
next command a reviewer can run when one is obvious.

## Web UI Upgrade Triggers

Build a web review UI when any of the following becomes true:

- average review queue age exceeds 7 days for two consecutive weeks
- more than 50 candidate facts are waiting for review at the same time
- more than one reviewer is actively making decisions
- entity ambiguity review requires comparing more than five candidates often
- reviewers need side-by-side source snapshot and extracted fact views
- non-technical reviewers need to participate
- review errors or reverted promotions show that CLI context is insufficient
- generated content review requires claim-level traceability inspection across
  many claims

The web UI should not be built before the CLI review flow proves the underlying
state transitions, audit records, and promotion rules.

## Web UI Scope

The first web review UI should support:

- queue dashboards
- candidate source detail pages
- candidate fact detail pages
- evidence and snapshot context views
- entity ambiguity comparison
- issue resolution
- approve, reject, and request-change actions
- promotion blocker display
- review history

The web UI must call the same review and promotion services used by CLI
commands. It must not implement separate state-transition logic.

## Operations Not Allowed

The review interface must not allow:

- promotion without evidence
- promotion with unresolved blocking issues
- promotion with unresolved entity ambiguity
- editing production facts directly without candidate, review, or audit records
- using candidate facts in final answers
- bulk approval without explicit dry-run output and confirmation
- LLM-only entity resolution approval without human review

## Consequences

Benefits:

- Review can start before a web UI exists.
- CLI operations remain auditable and testable.
- Web UI work has clear triggers instead of vague timing.
- State transitions stay centralized in services.

Costs:

- CLI review must present enough context to be safe.
- Review commands need careful UX despite being admin tools.
- A later web UI will still be needed once review volume grows.

## Follow-up Work

- Add CLI command specs to implementation tasks.
- Add CLI output fixtures for list, show, mutation, dry-run, and error cases.
- Define review decision database schema.
- Add tests for review operations and audit records.
- Add sample review output for candidate facts and entity ambiguity.
