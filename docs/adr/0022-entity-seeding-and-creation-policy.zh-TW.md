# ADR-022：Entity Seeding and Creation Policy

## 狀態

Accepted

## 日期

2026-06-11

## 背景

ADR-008 與 architecture flow 描述的 extraction output 包含 candidate
entities。ADR-018 在「candidate 看起來是必須先建立的新 entity」時把 resolution
標記為 `unresolved`。ADR-014 定義了 candidate sources、candidate facts、
candidate issues 的 state machines，但沒有 candidate entities 的 state machine。

這在實作前留下兩個缺口：

- Phase 1 的 table list 沒有 `candidate_entities` 表，也沒有任何 ADR 定義新的
  production entity 如何建立、review 或 promotion。
- Phase 2 的 entity resolution 需要 `product:iphone-15-pro`、`chip:a17-pro`
  這類 canonical entities 已經存在，但沒有文件說明初始 entities 從哪裡來。

完整的 candidate-entity promotion workflow 會複製 candidate fact state machine，
並需要自己的 review operations。這超出第一條 vertical slice 需要的機制。

## 決策

第一條 vertical slice 的 canonical entities 以人工 seed 建立。Ingestion 不建立
production entities。

具體規則：

- Canonical entities 與其 aliases 透過 checked-in seed data 建立，由 migrations
  或 CLI `entity create` command 套用。
- Seed data 的變更以程式碼的方式 review，透過 version control review。在這個
  階段，這個 review 取代 candidate-entity state machine。
- Extraction 產出的 entity references 放在 candidate fact 的 resolution
  metadata（ADR-018）裡，不是獨立的 candidate entity records。
- `candidate_entities` 表與 candidate-entity promotion state machine 延後到
  後續 ADR。在那之前，ADR-008 與 architecture flow 中提到的「candidate
  entities」指的是儲存在 candidate facts 上的 unresolved entity references。

## 第一條 Vertical Slice 的 Seed 範圍

初始 seed 至少必須包含第一份 Apple technical specification fixture 需要的
entities：

- `product-line:iphone`
- `product-generation:iphone-15-series`
- `product:iphone-15-pro`
- `chip:a17-pro`
- entity resolution fixtures 會用到的 aliases 與 model numbers

Seed records 必須滿足 ADR-002 的 base entity fields 與 lifecycle status 規則。
Production entities 仍然不允許 `needs_review`。

## Ingestion 期間的新 Entity 流程

當 entity resolution 因為 canonical entity 不存在而回傳 `unresolved` 時：

1. Candidate fact 帶著 unresolved entity issue 留在 review。
2. 維護者透過 seed data 或 `entity create` 建立缺少的 entity。
3. 對受影響的 candidate facts 重新執行 entity resolution。
4. 後續依 ADR-014 與 ADR-018 繼續正常的 review 與 promotion。

Ingestion、parsers 與 LLM-assisted extraction 不可寫入 production `entities`
表。

## Redirects 與 Merges

ADR-002 允許 `redirect` 與 `merged` statuses。第一條 vertical slice 的規則：

- Redirect entities 可以透過同樣的 seed 或 CLI 路徑建立。
- Entity merges 是人工操作，必須寫入 review decision record，記錄 merge 原因與
  受影響的 references。
- 完整的 merge 與 reference-rewrite 程序延後到後續 ADR。

## 影響

效益：

- Phase 2 對「entities 從哪裡來」有具體且不阻塞的答案。
- Production entities 維持單一且可稽核的建立路徑。
- Candidate-entity state machine 延後到 ingestion volume 足以支持時才設計，
  而不是憑空預先設計。

成本：

- 新產品需要先人工 seed，其 facts 才能 promotion。
- 部分 candidate facts 會在 review 等待 entity 被 seed。
- 當 entity 建立量超過人工 seed 能負擔時，仍需要後續 ADR。

## 曾考慮的替代方案

### 現在就做 Candidate-Entity State Machine

第一條 slice 拒絕此方案，因為在真實 ingestion volume 出現前，它只是複製
candidate fact 的 review 機制。

### Extraction 期間自動建立 Entities

拒絕，因為錯誤或重複的 entities 會破壞 facts、citations 與 retrieval 依賴的
identity layer。ADR-018 已要求保守的 resolution；silent entity creation 會繞過
它。

## 後續工作

- 在 implementation plan backlog 加入 entity seed data 與 `entity create` CLI
  command。
- 當 ingestion 需要時，在後續 ADR 定義 candidate-entity promotion state
  machine。
- 在後續 ADR 定義完整的 entity merge 與 redirect 程序。
