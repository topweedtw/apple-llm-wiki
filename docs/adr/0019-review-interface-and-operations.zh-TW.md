# ADR-019：Review Interface and Operations

## 狀態

Proposed

## 日期

2026-06-11

## 背景

ADR-014 定義 candidate 與 promotion state machine。ADR-018 定義 entity resolution decisions。Implementation plan 提到 review 應先用 CLI/admin commands，之後再做 web UI。

目前缺少的決策是 humans 如何執行 review work：

- 哪些 operations 必須先在 CLI 存在
- 哪些 operations 不應永遠只靠 CLI
- reviewer 必須看到哪些資訊
- 每個 decision 必須寫入哪些 audit records
- 什麼條件下專案應建立 web review UI

Review 是 safety boundary。如果 review operations 不清楚，系統可能 promote unsupported facts、接受 ambiguous entity resolution，或失去 ADR set 要求的 audit trail。

## 決策

第一條 vertical slice 先使用 CLI/admin review commands。Web review UI 延後到 review volume、ambiguity 或 collaboration needs 足以支持時再建立。

CLI 必須支援 ingestion MVP 所需的所有 review decisions。當 review work 對 CLI 來說太 visual、high-volume 或 multi-user 時，必須引入 web UI。

## CLI-First Review Scope

第一版 implementation 必須支援以下 CLI/admin operations：

- 依 state 列出 candidate sources
- 顯示 candidate source details、snapshot metadata 與 classification
- approve 或 reject candidate sources
- 依 state、source、entity、predicate、issue 或 freshness 列出 candidate facts
- 顯示 candidate fact details
- 顯示 evidence locator 與 quote
- 顯示 evidence 周邊的 source snapshot context
- 顯示 entity resolution candidates、scores、signals 與 ambiguity set
- approve entity resolution
- reject entity resolution
- 從 ambiguity set 選擇不同 canonical entity
- 將 candidate issues 標記為 resolved
- accept non-blocking issues
- reject candidate facts
- approve candidate facts
- promote approved candidate facts
- 顯示 promotion blockers
- 顯示 review decision history

Mutating operations 必須要求 explicit candidate IDs 或 review IDs。第一條 vertical slice 不允許 bulk mutation，除非顯示 dry-run summary 並明確確認。

## Reviewer Context Requirements

Approve candidate fact 前，review interface 必須顯示：

- candidate fact ID
- source ID、title、URL、trust level、locale 與 fetched timestamp
- source snapshot checksum
- predicate 與 proposed value
- raw source wording 或存在時的 `raw_value`
- evidence ID、locator 與 quote
- subject 與 object entity resolution status
- entity resolution score、match method、signals 與 ambiguity set
- candidate issues 與 issue states
- freshness 與 confidence proposal
- conflicting 或 overlapping production facts
- proposed production fact preview

缺少這些 context 時，不允許 approval。

## Review Decisions

每個 mutating review operation 都必須寫入 review decision record。

Review decision records 必須包含：

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

以下操作必須填 reason：

- rejecting candidate sources
- rejecting candidate facts
- accepting non-blocking issues
- approving entity resolution below the auto-resolution threshold
- overriding the top entity resolution candidate
- promoting a candidate with any accepted non-blocking issue

## CLI Commands

Initial command groups：

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

Command names 可在 implementation 時調整，但 operation coverage 必須保留。

## Web UI Upgrade Triggers

以下任一條件成立時，建立 web review UI：

- average review queue age 連續兩週超過 7 days
- 同時有超過 50 candidate facts 等待 review
- 超過一位 reviewer actively making decisions
- entity ambiguity review 經常需要比較超過五個 candidates
- reviewers 需要 side-by-side source snapshot 與 extracted fact views
- non-technical reviewers 需要參與
- review errors 或 reverted promotions 顯示 CLI context 不足
- generated content review 需要跨許多 claims 檢查 claim-level traceability

Web UI 不應早於 CLI review flow 證明 underlying state transitions、audit records 與 promotion rules 前建立。

## Web UI Scope

第一版 web review UI 應支援：

- queue dashboards
- candidate source detail pages
- candidate fact detail pages
- evidence 與 snapshot context views
- entity ambiguity comparison
- issue resolution
- approve、reject 與 request-change actions
- promotion blocker display
- review history

Web UI 必須呼叫與 CLI commands 相同的 review and promotion services，不得實作另一套 state-transition logic。

## Operations Not Allowed

Review interface 不得允許：

- promotion without evidence
- promotion with unresolved blocking issues
- promotion with unresolved entity ambiguity
- 直接編輯 production facts 而沒有 candidate、review 或 audit records
- 在 final answers 使用 candidate facts
- bulk approval without explicit dry-run output and confirmation
- LLM-only entity resolution approval without human review

## 影響

Benefits：

- Web UI 存在前即可開始 review。
- CLI operations 保持 auditable and testable。
- Web UI work 有明確 triggers，而不是模糊 timing。
- State transitions 維持集中在 services。

Costs：

- CLI review 必須呈現足夠 context 才安全。
- Review commands 即使是 admin tools，也需要謹慎 UX。
- Review volume 成長後仍需要 web UI。

## 後續工作

- 將 CLI command specs 加入 implementation tasks。
- 定義 review decision database schema。
- 增加 review operations 與 audit records tests。
- 增加 candidate facts 與 entity ambiguity 的 sample review output。
