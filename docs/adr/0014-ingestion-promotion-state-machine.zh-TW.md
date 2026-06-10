# ADR-014：Ingestion Promotion State Machine

## 狀態

Proposed

## 日期

2026-06-10

## 背景

ADR-003、ADR-008、ADR-010 與 ADR-011 已定義 candidate facts、validation、review 與 promotion。這些 ADR 的目的，是避免 incomplete 或 unsupported claims 進入 production facts。

目前缺口在 operational layer：candidate sources、candidate facts、issues、review decisions 與 production publication 的 allowed states 和 transitions 需要明確到可實作、可測試、可稽核。

## 決策

為 candidate sources、candidate facts 與 candidate issues 使用明確 state machines。只有 approved candidate fact 且所有 blocking issues 已解決時，才允許 promote into production facts。

## Candidate Source States

允許的 candidate source states：

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

預設 transition path：

```text
discovered
 -> pending_fetch
 -> fetched
 -> classified
 -> extraction_ready
 -> ready_for_review
 -> published
```

Failure 或 terminal transitions：

```text
pending_fetch -> rejected
extraction_ready -> extraction_failed
ready_for_review -> rejected
published -> deprecated
```

## Candidate Fact States

允許的 candidate fact states：

```text
extracted
intake_valid
needs_review
blocked
approved
rejected
promoted
```

預設 transition path：

```text
extracted
 -> intake_valid
 -> needs_review
 -> approved
 -> promoted
```

Blocking transition path：

```text
extracted
 -> intake_valid
 -> blocked
 -> needs_review
 -> approved
 -> promoted
```

Rejected candidates 為 terminal，除非從 corrected extraction 或 manual edit 建立新的 candidate。

## Candidate Issue States

允許的 issue states：

```text
open_blocking
open_non_blocking
resolved
accepted_non_blocking
rejected_candidate
```

Blocking issues 範例：

- missing evidence
- unresolved subject entity
- unresolved object entity when required
- invalid predicate
- schema mismatch
- invalid locale or time qualifier

Non-blocking issues 範例：

- weak but usable source wording
- optional unit normalization note
- low-priority alias suggestion
- review note for future parser improvement

## Promotion Rules

Candidate fact 只有在以下條件成立時才能 promote：

- candidate fact state 是 `approved`
- 所有 blocking issues 都是 `resolved`
- 剩餘 non-blocking issues 都是 `accepted_non_blocking`
- subject entity resolution 已 final
- predicate 需要 object 時，object entity resolution 已 final
- predicate 已 approved
- value type 符合 predicate
- 適用 unit 時，unit 已 normalized
- locale 與 time qualifiers valid
- source refs 指向 existing evidence records
- freshness 與 confidence 已 assigned
- reviewer identity 與 timestamp 已 recorded

Promotion 會 create 或 update production fact，並記錄 audit event。

## Production Fact Restrictions

Production facts 不得包含：

- `review_status`
- `needs_review`
- unresolved entity references
- unresolved predicates
- missing evidence references
- candidate-only issue fields

Unknown 或 unreviewed claims 必須留在 candidate facts。如果 historical value unknown，且對 review workflow 有幫助，使用 `candidate-fact:*` record。不要建立帶有 `review_status: needs_review` 的 production `fact:*` record。

## Review Decisions

Review decisions 應記錄：

- reviewer identity
- timestamp
- decision: `approve`, `reject`, `request_changes`, 或 `accept_non_blocking_issue`
- reason
- changed fields
- previous candidate state
- next candidate state

## 影響

Benefits：

- Promotion 變得可測試、可稽核。
- Candidate records 可以 incomplete，同時不降低 production quality。
- Review UI 可以顯示精確 next actions。
- ADR-003 與 ADR-009 對 unknown 或 unreviewed facts 的衝突會消失。

Costs：

- 需要 state transition validation。
- 需要 review 與 audit tables。
- Manual review workflows 需要清楚的 UI support。

## 後續工作

- 定義 allowed states 的 database constraints。
- 在 ingestion services 定義 transition validation。
- 更新 ADR-009 unknown-data examples，改用 `candidate-fact:*`。
- 增加 invalid promotion attempts 的 tests。
