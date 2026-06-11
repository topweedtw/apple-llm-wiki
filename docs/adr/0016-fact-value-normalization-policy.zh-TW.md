# ADR-016：Fact Value Normalization Policy

## 狀態

Proposed

## 日期

2026-06-11

## 背景

ADR-003 定義 production facts 使用 `value`、`value_type`、選用的 `unit`，以及 evidence-backed citations。Review 時出現一個問題：facts 是否也應加入 `raw_value`、`normalized_value` 與 `normalized_unit`。

系統在實作前需要明確的 value policy。否則 ingestion、validation、retrieval 與 answer generation 可能會對哪個欄位是來源原文、哪個欄位是可查詢資料、哪個欄位用於呈現給使用者產生歧義。

## 決策

使用 `value` 作為 normalized、queryable fact value。使用 `evidence.quote` 作為 canonical source wording。允許 `raw_value` 作為 optional convenience field，用於保存簡短來源片語；但現階段不引入 `normalized_value` 作為獨立 production fact field。

Production fact model 應使用：

- `value`：用於 query、comparison、rendering 與 answer context 的 normalized value
- `value_type`：`value` 的型別
- `unit`：當 fact 是 numeric、money、range 或其他帶單位資料時使用的 normalized unit
- `object`：entity relation facts 指向其他 entity 時使用的 canonical entity ID
- `raw_value`：選用的簡短來源文字或 extracted phrase，本身不可作為 canonical evidence
- `evidence.quote`：支持該 fact 的 authoritative source quote 或 source span

## Rationale

目前不引入 `normalized_value`，因為它會和既有欄位重複：

- 對 entity relation facts，`object` 是 normalized entity reference
- 對 scalar facts，`value` 加 `unit` 是 normalized queryable representation
- 對 enum facts，`value` 是 normalized enum
- 對 date 與 datetime facts，`value` 是 normalized date 或 datetime

如果未來 use cases 需要分離 display 與 query values，可以用後續 ADR 加入 `display_value` 或 `normalized_value`，並定義 migration rules。

## Examples

Entity relation fact：

```yaml
id: fact:iphone-15-pro:uses-chip
type: EntityRelationFact
subject: product:iphone-15-pro
predicate: uses_chip
object: chip:a17-pro
value: A17 Pro
value_type: entity
unit: null
raw_value: A17 Pro chip
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
```

Scalar fact：

```yaml
id: fact:iphone-15-pro:display-size
type: ScalarFact
subject: product:iphone-15-pro
predicate: has_display_size
value: 6.1
value_type: number
unit: inch
raw_value: 6.1-inch display
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:display
```

## Candidate Facts

Candidate facts 在 normalization 完成前可以包含來源文字。

Candidate intake 可接受：

- `raw_value` 存在但 normalized `value` 尚未完成，前提是 blocking issue 記錄 missing normalization
- unresolved units，前提是已記錄 `unnormalized_unit` issue
- unresolved entity values，前提是已記錄 entity resolution issues

Promotion to production 要求 normalized `value`、有效的 `value_type`、適用時 normalized `unit`，以及 source-backed evidence。

## Evidence Relationship

`raw_value` 不是 evidence 的替代品。Production fact 即使有 `raw_value`，仍必須引用 evidence。Evidence record 仍是 source location 與 verification 的 authoritative place。

`raw_value` 用於 review、diffing 或 display 時的精簡 extracted wording。`evidence.quote` 用於對照來源驗證 claim。

## Validation Rules

Production fact validation 必須確認：

- `value` 存在，且已依 predicate normalization
- `value_type` 符合 predicate
- 需要 unit 時，`unit` 已 normalized
- predicate 需要 entity target 時，`object` 存在
- source refs 指向 evidence records
- `raw_value` 即使存在，也不能取代 evidence

Candidate validation 必須確認：

- missing normalized values 有 issue tracking
- unnormalized units 有 issue tracking
- source wording 透過 `raw_value`、evidence 或 source snapshot context 保留

## 影響

Benefits：

- 避免冗餘的 `normalized_value` 欄位。
- 保持 production facts 簡單且可查詢。
- 透過 evidence 與選用的 `raw_value` 保留來源文字。
- 讓 candidate ingestion 有清楚路徑，從 raw extraction 走到 normalized production facts。

Costs：

- 某些 rendering use cases 之後可能需要獨立 display field。
- Parsers 必須在 promotion 前 normalize values。
- Review tools 必須顯示 evidence quotes，而不只是 `raw_value`。

## 後續工作

- 更新 ADR-003 examples 與 optional fields，加入 `raw_value`。
- 更新 ADR-008 validation language，說明 raw 與 normalized value handling。
- 更新 ADR-011 fact schema validation language。
- 第一版 ingestion implementation 後，再評估是否需要 `display_value`。
