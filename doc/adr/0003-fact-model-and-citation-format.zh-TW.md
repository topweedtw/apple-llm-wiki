# ADR-003：Fact Model 與 Citation Format

## 狀態

Proposed

## 日期

2026-06-10

## 背景

ADR-001 將 Apple LLM Wiki 定義為 source-grounded knowledge base。ADR-002 則定義了 products、chips、operating systems、features、events、accessories、support policies 與 compatibility rules 的穩定 entities。

下一個決策是如何表示 source-backed facts 與 citations。這是 LLM 可靠性的核心層，因為模型應該根據可驗證主張回答，而不是根據無來源 prose 或鬆散語意匹配回答。

Apple 產品知識包含許多不同類型的主張：

- 靜態主張，例如產品發表日期。
- 結構化規格，例如螢幕尺寸、晶片、儲存容量、連接埠、重量或相機系統。
- 時間敏感主張，例如目前 availability、價格、trade-in value 或 support status。
- 地區特定主張，例如 regional model numbers、cellular bands、價格或隨附配件。
- 衍生主張，例如「第一款使用 USB-C 的 iPhone」或「比 iPhone 14 Pro 新」。
- 相容性主張，例如配件支援或 OS 支援。
- 衝突主張，尤其是官方頁面、支援頁面與二手來源彼此不一致時。

fact model 必須支援精確查詢、比較、graph traversal、source citation、freshness checks 與 conflict handling。

## 決策

將知識表示為 atomic、source-backed facts。

Fact 是關於一個或多個 entities 的單一主張。Facts 必須能追溯到 evidence。Facts 可以有 time bounds、locale bounds、confidence score 與 freshness state。

Facts 不是 wiki paragraphs。Facts 是可以被查詢、比較、引用與修訂的 normalized records。

## Fact Identity

Fact IDs 使用以下格式：

```text
fact:<subject-slug>:<predicate>[:<qualifier>]
```

範例：

```text
fact:iphone-15-pro:uses-chip
fact:iphone-15-pro:display-size
fact:iphone-15-pro:release-date:us
fact:apple-pencil-pro:compatible-with:ipad-pro-m4
```

規則：

- 當 fact 的意義穩定時，Fact ID 應保持穩定。
- Fact ID 不應包含 mutable values。
- 需要時可以將 locale、region 或 configuration 放入 qualifier。
- 如果主張隨時間改變，應保持 identity 穩定，並更新 validity metadata 或建立 replacement fact。

## Base Fact Fields

每個 fact 都應支援以下欄位：

```yaml
id: fact:iphone-15-pro:uses-chip
type: EntityRelationFact
subject: product:iphone-15-pro
predicate: uses_chip
object: chip:a17-pro
value: A17 Pro
value_type: entity
unit: null
qualifiers: {}
valid_from: 2023-09-12
valid_to: null
locale: global
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
confidence: high
freshness: historical
created_at: 2026-06-10
updated_at: 2026-06-10
last_verified_at: 2026-06-10
```

必要欄位：

- `id`
- `type`
- `subject`
- `predicate`
- `value`
- `value_type`
- `source_refs`
- `confidence`
- `freshness`
- `created_at`
- `updated_at`

選用欄位：

- `object`
- `unit`
- `qualifiers`
- `valid_from`
- `valid_to`
- `locale`
- `last_verified_at`
- `supersedes`
- `superseded_by`
- `conflicts_with`
- `notes`

## Fact Types

### EntityRelationFact

表示 entities 之間的關係。

```yaml
id: fact:iphone-15-pro:uses-chip
type: EntityRelationFact
subject: product:iphone-15-pro
predicate: uses_chip
object: chip:a17-pro
value: A17 Pro
value_type: entity
```

### ScalarFact

表示數字、字串、日期、布林值或枚舉值。

```yaml
id: fact:iphone-15-pro:display-size
type: ScalarFact
subject: product:iphone-15-pro
predicate: has_display_size
value: 6.1
value_type: number
unit: inch
```

### TemporalFact

表示有明確有效時間範圍的主張。

```yaml
id: fact:iphone-15-pro:sales-status:us
type: TemporalFact
subject: product:iphone-15-pro
predicate: has_sales_status
value: discontinued
value_type: enum
valid_from: 2024-09-09
valid_to: null
locale: en-US
```

### CompatibilityFact

表示 entities 之間的相容性主張。

```yaml
id: fact:apple-pencil-pro:compatible-with:ipad-pro-m4
type: CompatibilityFact
subject: accessory:apple-pencil-pro
predicate: compatible_with
object: product-generation:ipad-pro-m4
value: compatible
value_type: enum
qualifiers:
  requires_os: os:ipados-17-5
```

### DerivedFact

表示從其他 facts 推導出的 fact。

```yaml
id: fact:iphone-15-series:first-iphone-generation-with-usb-c
type: DerivedFact
subject: product-generation:iphone-15-series
predicate: first_generation_with_feature
object: feature:usb-c
value: true
value_type: boolean
derived_from:
  - fact:iphone-15:has-feature:usb-c
  - fact:iphone-14:has-feature:lightning
```

Derived facts 必須引用其 input facts，並在 dependencies 變更時重新產生。

## Predicates

Predicates 應是 normalized snake_case verbs 或 verb phrases。

範例：

- `belongs_to_line`
- `belongs_to_generation`
- `uses_chip`
- `has_feature`
- `has_display_size`
- `has_weight`
- `has_release_date`
- `has_sales_status`
- `supports_os`
- `compatible_with`
- `requires`
- `introduced_at`
- `replaced_by`

Predicate definitions 未來應移入 controlled vocabulary，讓 ingestion、retrieval 與 UI rendering 使用相同語意。

## Value Types

允許的 `value_type`：

- `entity`
- `string`
- `number`
- `integer`
- `boolean`
- `date`
- `datetime`
- `enum`
- `list`
- `range`
- `money`

Values 應盡可能 normalized。來源原文應保留在 evidence，而不是 normalized value。

## Evidence Model

Citation 應指向 evidence，而不只是 source document。

Evidence records 用來定位支持 fact 的精確來源位置。

```yaml
id: evidence:apple-tech-specs-iphone-15-pro:chip
source_id: source:apple-tech-specs-iphone-15-pro
locator:
  type: section
  value: Chip
quote: A17 Pro chip
retrieved_at: 2026-06-10
```

允許的 locator types：

- `section`
- `heading`
- `css_selector`
- `text_anchor`
- `timestamp`
- `page`
- `table`
- `row`
- `manual_note`

Quotes 應簡短，只要足以驗證主張即可。

## Citation Format

內部 citation format：

```text
[source:<source_id>#<evidence_id>]
```

範例：

```text
[source:apple-tech-specs-iphone-15-pro#evidence:apple-tech-specs-iphone-15-pro:chip]
```

面向人類的 citations 應呈現 source title、URL 與 retrieval date。

範例：

```text
Apple Technical Specifications: iPhone 15 Pro, retrieved 2026-06-10.
```

LLM answers 應透過 evidence-backed source references 引用 facts，而不是自行創造 prose references。

## Confidence

允許的 confidence values：

- `high`
- `medium`
- `low`
- `unknown`

準則：

- 官方來源直接支持時使用 `high`。
- 可信二手來源或間接官方證據使用 `medium`。
- 弱證據、推論或部分支持的主張使用 `low`。
- 尚未 review 的 imported data 使用 `unknown`。

Confidence 不是 freshness。Fact 可以同時 high-confidence 但 stale。

## Freshness

允許的 freshness values：

- `current`
- `possibly_stale`
- `deprecated`
- `historical`
- `disputed`
- `needs_review`

Freshness 應獨立於 confidence 更新。

範例：

- 發表日期通常是 `historical`。
- 目前販售狀態可能是 `current` 或 `possibly_stale`。
- 來源衝突的主張應標記為 `disputed`。
- 未經 review 的 imported claim 應標記為 `needs_review`。

## Locale 與 Region

Facts 預設為 global。

當主張具有地區性時，使用 `locale` 或 qualifiers。

```yaml
id: fact:iphone-15-pro:release-date:us
subject: product:iphone-15-pro
predicate: has_release_date
value: 2023-09-22
value_type: date
locale: en-US
```

價格、availability、cellular bands、regulatory behavior 與 bundled accessories 通常需要 locale 或 region qualifiers。

## Conflict Handling

不要悄悄覆蓋衝突 facts。

當來源不一致時：

- 如果 facts 代表不同 scopes、locales 或 time ranges，保留兩者。
- 如果 facts 在相同 scope 下互相衝突，標記為 `disputed`。
- 使用 `conflicts_with` 連結衝突 facts。
- 回答排序時優先使用官方來源，但保留二手來源以便 audit 與說明。

範例：

```yaml
conflicts_with:
  - fact:iphone-example:weight:secondary-source
freshness: disputed
```

## Update and Supersession

Facts 應透過 metadata 版本化，而不是破壞性取代。

當 fact 改變時：

- 如果舊主張在某個時間範圍內曾為真，更新舊 fact 的 `valid_to`。
- 如果新主張有不同 scope 或 validity period，建立新 fact。
- 當新 fact 取代舊解釋時，使用 `supersedes` 與 `superseded_by`。
- 新舊 facts 都保留 source references。

## 影響

優點：

- LLM answers 可以引用精確 evidence。
- Structured facts 支援精確比較與篩選。
- Temporal 與 locale fields 可減少過期或過度概括的回答。
- Confidence 與 freshness 分離，有助於 ranking 與 review workflows。
- 可以表示衝突而不失去 auditability。

成本：

- Ingestion 必須抽取 evidence，而不只是 values。
- Predicate 與 unit normalization 需要紀律。
- Derived facts 需要 dependency tracking。
- Fact 進入 production use 前需要更多 metadata。

## 考慮過的替代方案

### 將 Claims 存成 Wiki Paragraphs

不採用，因為 paragraphs 難以比較、驗證、精確引用與安全更新。

### 只引用 Source URLs

不採用，因為 URL 無法指出支持某個主張的精確 evidence。可靠的 LLM answers 需要 evidence-level citation。

### 將 Facts 視為永遠 Immutable

不採用，因為許多 Apple facts 具有時間敏感性或地區性。模型必須支援 validity ranges 與 supersession。

## 後續工作

- 在 ADR-004 定義 source trust levels。
- 定義 predicate vocabulary 與 unit normalization。
- 定義 ingestion validation rules。
- 定義 facts 如何呈現在 wiki pages 與 LLM answers 中。
