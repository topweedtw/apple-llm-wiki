# Architecture Flow（架構流程）

本文件摘要說明 ADR 集合所描述的 Apple LLM Wiki 系統架構、開發階段與營運資料流。

---

## System Architecture

完整系統架構，從 source discovery 到 content generation。

```text
+----------------------+
| Source Discovery     |
| Apple / archive /    |
| secondary / retailer |
+----------+-----------+
           |
           v
+----------------------+
| Candidate Source     |
| Queue                |
+----------+-----------+
           |
           v
+----------------------+
| Fetch + Snapshot     |
| HTTP first, browser  |
| fallback, checksum   |
+----------+-----------+
           |
           v
+----------------------+
| Source Registry      |
| trust_level, scope,  |
| locale, review state |
+----------+-----------+
           |
           v
+----------------------+
| Extraction Layer     |
| parser first, LLM    |
| assisted if needed   |
+----------+-----------+
           |
           v
+----------------------+
| Staging              |
| candidate_entities   |
| candidate_facts      |
| evidence anchors     |
+----------+-----------+
           |
           v
+----------------------+
| Validation + Review  |
| schema, evidence,    |
| entity resolution,   |
| conflicts, freshness |
+----------+-----------+
           |
           v
+----------------------+
| System of Record     |
| Postgres             |
| sources              |
| entities             |
| facts                |
| evidence             |
| pages                |
| reviews/jobs         |
+----+------+-----+----+
     |      |     |
     |      |     v
     |      |  +------------------+
     |      |  | Freshness Jobs   |
     |      |  | TTL/checksum/    |
     |      |  | re-ingestion     |
     |      |  +------------------+
     |      |
     |      v
     |  +------------------+
     |  | Wiki Pages       |
     |  | human-readable   |
     |  | curated context  |
     |  +------------------+
     |
     v
+----------------------+
| Retrieval Indexes    |
| entity, fact, graph, |
| keyword, vector,     |
| evidence             |
+----------+-----------+
           |
           v
+----------------------+
| Retrieval Planner    |
| intent, entity match,|
| fact lookup, graph,  |
| ranking, context     |
+----------+-----------+
           |
           v
+----------------------+
| LLM Answer Layer     |
| cited answers,       |
| freshness warnings,  |
| conflict handling    |
+----------+-----------+
           |
           v
+----------------------+
| Content Generation   |
| question banks,      |
| video/retail/FABE    |
| scripts with claims  |
+----------------------+
```

---

## Development Phases

每個 phase 都建立在前一個 phase 之上。第一個目標是一條正確的 vertical slice，從 source URL 到 cited answer。

```text
Phase 0: Project Skeleton
  - TypeScript / Node.js / pnpm scaffold
  - Postgres migration setup
  - Vitest test runner + fixture directory
  - Coding conventions for IDs, enums, timestamps
  EXIT: migrations run locally, tests run in CI

Phase 1: Canonical Data Model          (ADR-003, 006, 013, 014, 020, 021)
  Tables:
    sources            source_snapshots   evidence
    entities           entity_aliases
    candidate_sources  candidate_facts    candidate_fact_issues
    facts              fact_supersession
    review_decisions   publication_events
    unit_registry      predicate_registry
    index_outbox
  EXIT: schema tests enforce evidence requirement + no needs_review on production facts

Phase 2: Ingestion Pipeline MVP        (ADR-008, 009, 010, 011, 018)
  Services:
    SourceRegistrationService   SourceFetcher       SnapshotStore
    SourceClassifier            TechSpecParser
    CandidateFactWriter         CandidateValidationService
  EXIT: fixture snapshot -> candidate facts + evidence, parser golden tests pass

Phase 3: Review and Promotion          (ADR-014, 018, 019, 021)
  Services:
    ReviewDecisionService   CandidateIssueService   FactPromotionService
    PublicationAuditService IndexOutboxWriter        ReviewCommandService
  EXIT: promotion passes with evidence, fails without; outbox emits in same transaction

Phase 4: Retrieval MVP                 (ADR-005, 018)
  Services:
    EntityMatcher         EntityResolutionService   FactLookupService
    EvidenceHydrationService   FreshnessPolicyService   AnswerContextBuilder
  EXIT: exact queries return production facts only, evidence from canonical records

Phase 5: Cited Answer API              (ADR-007)
  Endpoint: POST /answer
  EXIT: response includes fact + evidence citations; unsupported claims refused

Phase 6: Index Outbox and Derived Views  (ADR-013, 015)
  Commands:
    index process   index rebuild   index check-drift
  EXIT: outbox idempotent, projections rebuildable, drift detectable

Phase 7: Freshness and Re-ingestion    (ADR-006)
  Jobs:
    TTL expiry job   source checksum job   re-ingestion diff
  EXIT: TTL marks current -> possibly_stale; stale answers surface warning

Phase 8: Page and Content Generation   (ADR-012)
  Outputs:
    wiki pages   question banks   FABE scripts   retail/video scripts
  EXIT: all factual claims traceable to production facts; generated content stays outside fact layer
```

---

## Operational Data Flow

這個 flow 呈現從 raw source 到 cited answer 的完整路徑，包含 human review decision points。

```text
[Source Discovery]
  Apple official / archive / secondary / retailer
         |
         |  CLI: source register
         v
[Candidate Source Queue]
  status: discovered -> pending_fetch
         |
         |  CLI: source fetch
         v
[Fetch + Snapshot]
  HTTP fetch (undici/fetch) -> Playwright fallback
  stores: raw HTML, checksum, locale, parser version
         |
         v
[Source Classification]        (ADR-004)
  trust_level, source_type, scope, locale
         |
         |  CLI: review source approve / reject    <- Reviewer
         v
[Extraction Layer]             (ADR-010)
  TechSpecParser (Cheerio) -> LLM-assisted fallback
         |
         v
[Staging]
  candidate_entities, candidate_facts, evidence anchors
         |
         v
[Candidate Intake Validation]  (ADR-008, 011, 016, 020, 021)
  - predicate allowed?
  - value type matches predicate?
  - unit in registry, or unnormalized_unit issue recorded?
  - evidence attached, or missing_evidence issue recorded?
  - entity resolution attempted?
         |
         +-- score >= 0.95 -----------> [auto-resolved entity]
         |
         +-- score < 0.70 or no entity --> [unresolved]
         |                                    |
         |                                    v
         |                            CLI: review entity choose
         |                            <- Reviewer (required)
         |
         +-- 0.70 <= score < 0.95 ----> [needs_review: entity]
         |                                    |
         |                             CLI: review entity approve/choose
         |                             <- Reviewer
         |
         +-- blocking issues ----------> [blocked]
         |                                    |
         |                             CLI: review issue resolve
         |                             <- Reviewer
         |                                    |
         +------------------------------------+
         |
         v
[needs_review: candidate fact]
  shows: source, snapshot, evidence quote, entity resolution,
         predicate preview, conflicts, proposed fact
         |
         |  CLI: review fact approve / reject    <- Reviewer
         v
[approved]
         |
         |  CLI: fact promote [--dry-run]        <- Reviewer
         v
[Promotion Validation]         (ADR-014, 016, 018, 021)
  - all blocking issues resolved?
  - entity types match predicate roles?
  - unit is active registry unit?
  - source_refs point to evidence?
  - freshness and confidence assigned?
         |
         v  (in one DB transaction)
+------------------------+
| System of Record       |
| Postgres               |
| facts + evidence       |
| publication_events     |
| index_outbox events    |
+----+-------+------+----+
     |       |      |
     v       v      v
[index_   [Wiki   [Freshness
 outbox]   Pages]  Jobs]
     |               |
     v               v
[Index        TTL expires?
 Workers]     checksum change?
     |               |
     v               v
[Retrieval      [possibly_stale]
 Indexes]        -> review queue
     |
     v
[Retrieval Planner]
  intent detection, entity match,
  fact lookup, graph traversal,
  trust + freshness ranking
     |
     v
[LLM Answer Layer]            (ADR-007)
  hydrate facts from Postgres
  cited answers, freshness warnings,
  conflict surfacing
     |
     v
[Content Generation]          (ADR-012)
  question banks, FABE scripts,
  retail/video scripts
  claim-level traceability enforced
```

---

## Key Invariants

這些 invariants 在所有 phases 與 operations 中都成立。

- Production facts 是唯一 canonical answerable claims。
- Candidate fact 沒有 evidence 時不得 promotion。
- Entity resolution 必須在 promotion 前完成。
- LLM answer layer 從 Postgres hydrate facts，而不是從 index payloads hydrate。
- Derived views（indexes、pages、projections）永遠可以從 canonical records rebuild。
- `needs_review` 不得出現在 production fact 或 production entity record。
