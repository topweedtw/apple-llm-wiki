# Implementation Plan（實作計畫）

本計畫把 ADR 集合轉成可執行的工程 roadmap。第一個目標不是一次建完整個 Apple LLM Wiki，而是先交付一條正確的 vertical slice：

```text
Apple technical specification URL
 -> source snapshot
 -> candidate facts and evidence
 -> validation and review
 -> production facts
 -> retrieval context
 -> cited answer
```

## 指導原則

- 以 Postgres 的 production records 作為 canonical source of truth。
- 將 indexes、graph projections、pages、answer contexts 視為 derived views。
- 沒有 evidence 的 candidate fact 絕不 promotion。
- 優先使用 deterministic parsers，再使用 LLM-assisted extraction。
- Review 與 promotion 的 state transitions 必須明確且可測試。
- Answer generation 前必須從 canonical records hydrate facts 與 evidence。

## Phase 0: Project Skeleton

目標：建立實作基礎，但不要太早綁定重型基礎設施。

Deliverables:

- application runtime 與 package structure
- database migration setup
- test runner 與 fixture directory
- local development configuration
- IDs、timestamps、enums、validation errors 的 coding conventions

Exit criteria:

- migrations 可以在本機 database 執行
- tests 可以在 CI 或本機 command 執行
- fixture files 可以被 parser tests 載入

## Phase 1: Canonical Data Model

目標：實作 ADR-003、ADR-013、ADR-014 描述的 canonical schema。

Initial tables:

- `sources`
- `source_snapshots`
- `evidence`
- `entities`
- `entity_aliases`
- `candidate_sources`
- `candidate_facts`
- `candidate_fact_issues`
- `facts`
- `fact_supersession`
- `review_decisions`
- `publication_events`
- `unit_registry`
- `predicate_registry`
- `index_outbox`

Required constraints:

- production facts 必須有 `source_refs`
- production facts 不可包含 `review_status`
- candidate facts 只有在 issues 記錄原因時，才可以包含 unresolved fields
- `needs_review` 只能出現在 candidate 或 review records
- candidate issue states 必須使用 ADR-014 enum values
- fact freshness 必須使用 ADR-006 production freshness values

Exit criteria:

- schema tests 會拒絕沒有 evidence 的 production facts
- schema tests 會拒絕帶有 `needs_review` 的 production facts
- schema tests 只允許具備明確 issues 的 incomplete candidate facts

## Phase 2: Ingestion Pipeline MVP

目標：支援一條 deterministic ingestion path，先處理 Apple technical specification page。

前置條件：fixture 需要的 canonical entities 必須先依 ADR-022 完成 seed，
ingestion 才能執行。Ingestion 不建立 production entities。

Pipeline:

```text
seed canonical entities (ADR-022)
 -> register candidate source
 -> fetch source
 -> create snapshot
 -> classify source
 -> parse known fields
 -> create evidence anchors
 -> create candidate facts with entity references
 -> run candidate intake validation
```

Initial parser target:

- 一份 Apple technical specification page fixture
- 欄位包含 product name、chip、display size、connector、release date、model identifiers 等

Services:

- `SourceRegistrationService`
- `SourceFetcher`
- `SnapshotStore`
- `SourceClassifier`
- `TechSpecParser`
- `CandidateFactWriter`
- `CandidateValidationService`

Exit criteria:

- fixture snapshot 可以產生 candidate facts 與 evidence
- parser golden tests 會把輸出和預期 YAML 或 JSON 比對
- 缺少 evidence 的 candidate facts 會進入 blocked 或 `needs_review`

## Phase 3: Review and Promotion

目標：讓 candidate-to-production promotion 明確、可稽核且安全。

State machine requirements:

- 實作 ADR-014 的 candidate source states
- 實作 ADR-014 的 candidate fact states
- 實作 ADR-014 的 candidate issue states
- 在單一 promotion service 中執行 promotion rules

Services:

- `ReviewDecisionService`
- `CandidateIssueService`
- `FactPromotionService`
- `PublicationAuditService`
- `IndexOutboxWriter`
- `ReviewCommandService`

Promotion flow:

```text
candidate fact approved
 -> blocking issues verified resolved
 -> evidence references verified
 -> entity IDs verified
 -> production fact written
 -> publication event written
 -> index outbox event written
```

Exit criteria:

- reviewed 且有 source-backed evidence 的 fact 可以 promotion
- 沒有 evidence 時 promotion 失敗
- 有 unresolved entity references 時 promotion 失敗
- promotion 在同一個 database transaction 內送出 `index_outbox` events

## Phase 4: Retrieval MVP

目標：用 production facts 回答精確的產品規格問題。

Retrieval scope:

- 依 canonical ID、name、alias、model number 做 entity lookup
- 依 subject 與 predicate 做 fact lookup
- evidence hydration
- trust 與 freshness ranking
- compact answer context construction

Initial supported question type:

```text
What chip does iPhone 15 Pro use?
```

Services:

- `EntityMatcher`
- `FactLookupService`
- `EvidenceHydrationService`
- `FreshnessPolicyService`
- `AnswerContextBuilder`
- `EntityResolutionService`

Exit criteria:

- retrieval 只回傳 production facts
- retrieval 忽略 candidate facts
- evidence 從 canonical records 載入
- stale 或 disputed facts 會出現在 answer context 中

## Phase 5: Cited Answer API

目標：公開一個小型 answer API，證明 knowledge path 可以運作。

第一版實作以 deterministic templates 從 retrieved facts 與 evidence 組合 answer
字串。LLM-generated answer prose、model selection 與 answer faithfulness
validation 延後到未來的 ADR。這讓 Phase 5 可測試，且不需依賴 LLM 就能證明
data path。

Initial endpoint:

```http
POST /answer
```

Request:

```json
{
  "question": "What chip does iPhone 15 Pro use?",
  "locale": "en-US"
}
```

Response:

```json
{
  "answer": "iPhone 15 Pro uses the A17 Pro chip.",
  "facts": [
    {
      "id": "fact:iphone-15-pro:uses-chip",
      "freshness": "historical",
      "confidence": "high"
    }
  ],
  "citations": [
    {
      "source_id": "source:apple-tech-specs-iphone-15-pro",
      "evidence_id": "evidence:apple-tech-specs-iphone-15-pro:chip",
      "title": "iPhone 15 Pro - Technical Specifications"
    }
  ]
}
```

Exit criteria:

- answer 包含 citation metadata
- answer 會拒絕 unsupported claims
- current-status questions 必須執行 freshness checks
- answer generation 不會把 vector payloads 當成 canonical evidence
- answer text 由 deterministic templates 產生；通過此 phase 不需要任何 LLM call

## Phase 6: Index Outbox and Derived Views

目標：在加入更重的 search infrastructure 之前，先實作 ADR-015 的 consistency model。

Initial derived views:

- relationship projection table
- lightweight keyword search projection
- evidence lookup projection

Outbox behavior:

```text
canonical write
 -> index_outbox event
 -> async projection update
 -> processed event
```

Required commands:

- process pending index events
- replay failed index events
- rebuild all derived views
- rebuild projections for one entity
- check index drift

Exit criteria:

- outbox events 是 idempotent
- projections 可以從 canonical records 重建
- stale projection versions 可以被偵測
- answer retrieval 可以先使用 projection，再 hydrate canonical facts

## Phase 7: Freshness and Re-ingestion

目標：在支援 buying advice 或 availability questions 前，先讓 current-status claims 足夠安全。

Deliverables:

- 依 predicate 或 fact type 設定 TTL configuration
- freshness update job
- source checksum comparison
- re-ingestion diff records
- possibly stale facts 的 review queue

Exit criteria:

- TTL expiration 會把 current facts 標記為 `possibly_stale`
- source checksum 改變會建立 review work
- current-status answers 在只有 stale facts 可用時會提出警告

## Phase 8: Page and Content Generation

目標：產生 human-readable wiki pages 與 application-layer content，同時不弱化 fact model。

Deliverables:

- product page renderer
- page freshness inheritance
- question bank schema
- generated content claim references
- unsupported claims validation

Exit criteria:

- page factual claims 會連到 production facts
- generated factual claims 具備 claim-level traceability
- generated content 不會變成 production facts

## Milestones

Milestone 1: Schema and Promotion Safety

- canonical schema implemented
- promotion service implemented
- invalid promotion tests pass

Milestone 2: First Source Ingested

- one Apple tech spec fixture parsed
- candidate facts and evidence created
- reviewed facts promoted

Milestone 3: First Cited Answer

- exact specification query answered
- response includes fact and evidence citations
- candidate facts are ignored

Milestone 4: Derived View Consistency

- index outbox implemented
- relationship projection built
- rebuild and drift check commands available

Milestone 5: Freshness-Aware Answers

- TTL jobs implemented
- possibly stale facts surfaced
- current-status answer behavior tested

## Test Strategy

Schema tests:

- production facts require evidence
- production facts reject candidate-only fields
- candidate facts require explicit issues when incomplete

Parser tests:

- fixture snapshots produce expected candidate facts
- parser changes are checked against golden output
- evidence locators point to source spans

Promotion tests:

- approved candidate with evidence can promote
- missing evidence blocks promotion
- unresolved entity blocks promotion
- non-blocking issues require explicit acceptance

Retrieval tests:

- exact queries return structured facts
- candidate facts are ignored
- deprecated and superseded facts are excluded unless historical context asks for them
- citations hydrate from canonical evidence records

Index tests:

- publication writes outbox events
- event processing is idempotent
- projections can be rebuilt
- drift checks detect stale aggregate versions

Answer tests:

- factual answers include citations
- freshness-sensitive answers check TTL state
- disputed facts are surfaced as uncertainty
- unsupported claims are refused

## Initial Backlog

1. Scaffold TypeScript/Node.js project structure.
2. Add database migration tooling.
3. Create canonical schema migration.
4. Add enum definitions for freshness, confidence, candidate states, issue states, and review decisions.
5. Add canonical entity seed data and an `entity create` CLI command (ADR-022).
6. Implement source registration.
7. Add fixture snapshot for one Apple technical specification page.
8. Implement deterministic tech spec parser.
9. Implement entity resolution scoring.
10. Implement unit registry and unit normalization.
11. Implement predicate role registry.
12. Implement candidate intake validation.
13. Implement review decision records.
14. Implement CLI review commands and output fixtures.
15. Implement fact promotion service.
16. Implement index outbox writer.
17. Implement exact entity and fact lookup.
18. Implement cited answer endpoint.
19. Add rebuild and drift-check commands.

## Open Decisions

Open decisions 以 pre-phase checklist 追蹤。每個項目必須在對應 phase 開始前解決。

Phase 2 之前：

- 儲存與引用 Apple content 授權風險的 snapshot retention note 延後處理，不是第一條
  vertical slice 的 blocker。

Phase 4 之前：

- 定義 entity resolution scoring 以外的 retrieval ranking weights（ADR-005
  follow-up）。
- 定義 retrieval evaluation sets（ADR-005 follow-up）。
- 定義 answer contexts 的 context packing limits（ADR-005 follow-up）。

Phase 7 之前：

- 把 `has_trade_in_value` 與其他 pending-TTL predicates 加入 predicate
  registry（ADR-006、ADR-021 follow-up）。
- 定義 re-ingestion diff format（ADR-008 follow-up）。

Phase 8 之前：

- 定義 generated content 的 output schemas 與 unsupported claim detection
  rules（ADR-012 follow-up）。
- 決定 answer 與 content 的語言政策：response language 如何選擇，以及 fact
  `locale` 與它的關係。

LLM answer generation 之前（Phase 5 之後）：

- 以新 ADR 選定 LLM provider 與 model、prompt management、answer faithfulness
  validation。Phase 5 本身使用 deterministic templates。

Resolved by implementation sequencing:

- Page rendering 會在 Phase 8 實作，且必須等 Phase 6 的 derived view consistency 被證明後才進行。
- Semantic 與 vector retrieval 會在 Phase 6 之後漸進加入，前提是第一批 index 與 projection infrastructure 已就緒。
- Phase 5 的 answers 由 deterministic templates 從 retrieved facts 與 evidence
  組合；LLM-generated prose 需要未來的 ADR。

Resolved by ADR-022:

- 第一條 vertical slice 的 canonical entities 透過 checked-in seed data 或
  `entity create` CLI command 人工 seed。
- Ingestion 不建立 production entities；extraction 把 entity references 放在
  candidate fact resolution metadata。
- `candidate_entities` 表與 candidate-entity promotion state machine 延後到
  後續 ADR。

Resolved by ADR-019（reviewer identity）:

- Mutating review commands 從 `--reviewer <id>` 或 `REVIEWER_ID` environment
  variable 解析 reviewer identity，缺少時必須失敗。
- 第一條 vertical slice 信任 operator 提供的 identity；Web UI 必須加上真正的
  authentication。

Resolved by ADR-010（snapshot storage）:

- 第一條 vertical slice 把 raw snapshot content 與 normalized text 存在
  Postgres `source_snapshots` 表；filesystem 或 object storage 是以 checksum
  為 key 的升級路徑。

Resolved by ADR-019:

- Review 一開始使用 CLI/admin commands。
- CLI 必須支援 source review、candidate fact review、issue resolution、entity resolution approval、promotion blockers、review history。
- 當 review queue age、volume、multi-reviewer needs、visual comparison needs、non-technical reviewer participation 或 review error rates 足以支持投入時，才導入 Web UI。

Resolved by ADR-020:

- Production fact units 必須是 `null`，或 unit registry 中 active canonical unit IDs。
- `inch` 是 inch values 的 canonical unit；`in`、`inches`、`"` 是 aliases。
- `GB` 與 `TB` 是 decimal storage units；`GiB` 與 `TiB` 是 binary units，不可 silently convert。
- Promotion validation 會依 registry 檢查 units。

Resolved by ADR-021:

- Predicate definitions 會宣告 allowed subject entity types、object requirements、allowed object entity types、value types、unit dimensions、temporal behavior、locale policy。
- Entity resolution scoring 使用 predicate role constraints。
- Promotion validation 會拒絕 subject/object entity types 或 value types 不符合 predicate registry 的 facts。
- Enum-valued predicates（`has_support_status`、`has_sales_status`、
  `compatible_with`）宣告封閉的 `allowed_values` 集合，並在 promotion 時驗證。

Resolved by ADR-003（evidence quote limit）:

- Evidence quotes 上限為 300 個 Unicode 字元。超過上限的 quote 會記錄一個
  blocking 的 `evidence_quote_too_long` issue（由 ADR-008、ADR-011、ADR-014
  強制執行），並在縮短或被接受前阻擋 promotion。

Resolved by ADR-018:

- Entity resolution 使用 deterministic scoring。
- Auto-resolution 要求 score `>= 0.95`、比下一個 candidate 高出 `0.10` margin、predicate role 相符，且沒有 source-scope conflict。
- 像 "iPad Pro" 這種 ambiguous names，除非 source context 能消歧 product line、generation、product 或 variant，否則維持 review。

Resolved by ADR-017:

- Runtime: TypeScript on Node.js 26.x（Current line，先於 LTS 鎖定）。
- Package manager: pnpm。
- Web API: Fastify REST endpoints。
- CLI: Commander commands。
- Database access: Kysely with `pg`。
- Migration approach: checked-in SQL migration files，由 thin TypeScript migration runner 執行。
