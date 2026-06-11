# ADR-021：Predicate Role and Entity Type Constraints

## 狀態

Proposed

## 日期

2026-06-11

## 背景

ADR-003 將 predicates 定義為 normalized snake_case verbs 或 verb phrases。ADR-018 要求 entity resolution 驗證 resolved entity types 是否符合 predicate role。

目前缺少的決策是 predicate role registry：哪些 entity types 可以作為 fact subject、哪些 entity types 可以作為 fact object，以及 object 是否必填。

沒有這個 registry，entity resolution 與 promotion validation 無法可靠拒絕這類 facts：

```yaml
subject: chip:a17-pro
predicate: uses_chip
object: product:iphone-15-pro
```

Entity IDs 可能有效，但 predicate role 是錯的。

## 決策

定義 predicate role registry。Promotion validation 必須根據此 registry 檢查 production facts。

每個 predicate definition 應包含：

- predicate name
- allowed subject entity types
- object 是否 required
- object required 時允許的 object entity types
- allowed value types
- applicable 時允許的 unit dimensions
- predicate 是否 temporal
- locale 或 region 是 required、optional 或 prohibited
- derived facts 是否可使用該 predicate

Registry 應是 versioned data，而不是散落在 parser logic 中。

## Locale Policy Values

允許的 `locale_policy` values：

- `required`：使用此 predicate 的 production facts 必須包含 locale 或 region。
- `optional`：production facts 可以是 global，但當 claim scope 是 region-specific 時，必須包含 locale 或 region。
- `prohibited`：使用此 predicate 的 production facts 不得包含 locale 或 region，因為 claim 依定義是 global。

除非同步更新本 ADR 與 promotion validation，否則不得引入額外 locale policy enum values。

## Predicate Definition Format

範例：

```yaml
predicate: uses_chip
subject_types:
  - Product
  - Variant
object_required: true
object_types:
  - Chip
value_types:
  - entity
unit_dimensions: []
temporal: false
locale_policy: optional
derived_allowed: false
```

## Initial Predicate Role Registry

Identity and grouping：

```yaml
- predicate: belongs_to_line
  subject_types: [Product, ProductGeneration, Variant]
  object_required: true
  object_types: [ProductLine]
  value_types: [entity]

- predicate: belongs_to_generation
  subject_types: [Product, Variant]
  object_required: true
  object_types: [ProductGeneration]
  value_types: [entity]

- predicate: has_variant
  subject_types: [Product]
  object_required: true
  object_types: [Variant]
  value_types: [entity]

- predicate: variant_of
  subject_types: [Variant]
  object_required: true
  object_types: [Product]
  value_types: [entity]
```

Hardware and features：

```yaml
- predicate: uses_chip
  subject_types: [Product, Variant]
  object_required: true
  object_types: [Chip]
  value_types: [entity]

- predicate: has_feature
  subject_types: [Product, ProductGeneration, Variant, Chip, OperatingSystem, Accessory]
  object_required: true
  object_types: [Feature]
  value_types: [entity]

- predicate: has_display_size
  subject_types: [Product, Variant]
  object_required: false
  object_types: []
  value_types: [number]
  unit_dimensions: [length]

- predicate: has_weight
  subject_types: [Product, Variant, Accessory]
  object_required: false
  object_types: []
  value_types: [number]
  unit_dimensions: [mass]
```

Dates and events：

```yaml
- predicate: introduced_at
  subject_types: [Product, ProductGeneration, Chip, OperatingSystem, Accessory, Feature]
  object_required: true
  object_types: [Event]
  value_types: [entity]

- predicate: announced_at
  subject_types: [Product, ProductGeneration, Chip, OperatingSystem, Accessory, Feature]
  object_required: true
  object_types: [Event]
  value_types: [entity]
  status: legacy_alias
  preferred_predicate: introduced_at

- predicate: has_announcement_date
  subject_types: [Product, ProductGeneration, Chip, OperatingSystem, Accessory, Feature, Event]
  object_required: false
  object_types: []
  value_types: [date]

- predicate: has_release_date
  subject_types: [Product, ProductGeneration, OperatingSystem, Accessory]
  object_required: false
  object_types: []
  value_types: [date]
  locale_policy: optional
```

`introduced_at` 是將 entity 連到 announcement 或 launch event 的 preferred relationship predicate。`has_announcement_date` 是 scalar date predicate。`announced_at` 保留為 legacy alias 以維持 ADR compatibility，但新的 facts 應使用 `introduced_at`，除非後續 ADR 進一步收斂語意。

Compatibility and requirements：

```yaml
- predicate: compatible_with
  subject_types: [Product, Variant, Accessory, OperatingSystem, Feature]
  object_required: true
  object_types: [Product, ProductGeneration, Variant, Accessory, OperatingSystem, Feature]
  value_types: [enum]
  locale_policy: optional

- predicate: requires
  subject_types: [Product, Variant, Accessory, OperatingSystem, Feature, CompatibilityRule]
  object_required: true
  object_types: [Product, ProductGeneration, Variant, Accessory, OperatingSystem, Feature, Chip]
  value_types: [entity]
```

Operating systems and support：

```yaml
- predicate: runs_os
  subject_types: [Product, Variant]
  object_required: true
  object_types: [OperatingSystem]
  value_types: [entity]

- predicate: supports_os
  subject_types: [Product, ProductGeneration, Variant]
  object_required: true
  object_types: [OperatingSystem]
  value_types: [entity]

- predicate: has_support_status
  subject_types: [Product, ProductGeneration, Variant, Accessory, OperatingSystem]
  object_required: false
  object_types: []
  value_types: [enum]
  temporal: true
  locale_policy: optional
```

Lifecycle and availability：

```yaml
- predicate: has_sales_status
  subject_types: [Product, ProductGeneration, Variant, Accessory]
  object_required: false
  object_types: []
  value_types: [enum]
  temporal: true
  locale_policy: optional
  notes: Region-specific availability or sales status facts must include locale or region.

- predicate: has_price
  subject_types: [Product, Variant, Accessory]
  object_required: false
  object_types: []
  value_types: [money]
  unit_dimensions: [money]
  temporal: true
  locale_policy: required
```

Succession：

```yaml
- predicate: replaced_by
  subject_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  object_required: true
  object_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  value_types: [entity]

- predicate: replaces
  subject_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  object_required: true
  object_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  value_types: [entity]
```

Derived predicates：

```yaml
- predicate: first_generation_with_feature
  subject_types: [ProductGeneration, ProductLine]
  object_required: true
  object_types: [Feature]
  value_types: [boolean]
  derived_allowed: true
```

## Validation Rules

Promotion validation 必須在以下情況 reject candidate fact：

- predicate 不在 registry 中
- subject entity type 不符合 predicate
- required object 缺失
- object 存在但 object entity type 不被允許
- `value_type` 不被 predicate 允許
- unit dimension 不符合 predicate 允許的 unit dimensions
- locale 或 region policy 違反
- non-derived fact 使用 derived-only predicate

Candidate intake 可以允許 proposed predicates，但 proposed predicates 必須留在 review，直到 predicate registry 更新，或 fact 改寫成 existing predicate。

## Entity Resolution Interaction

Entity resolution scoring 必須使用 predicate role registry。

範例：

- 對 `uses_chip`，`Chip` object candidate 應優先於 `Product` candidate。
- 對 `belongs_to_generation`，`ProductGeneration` object candidate 應優先於 `ProductLine` candidate。
- 對 `compatible_with`，多種 entity types 都可能有效，因此必須由 context 與 evidence 決定 target。

如果 extracted name 很有信心地 resolve 到 predicate 不允許的 entity type，candidate fact 必須標記為 `blocked`，或改寫成正確 predicate。

## 影響

Benefits：

- Entity resolution 有具體 predicate-role target。
- Promotion validation 可以 reject structurally wrong facts。
- Parser output 更一致。
- Predicate evolution 可 audit。

Costs：

- Registry 必須隨 predicates 增加而維護。
- `compatible_with` 這類 broad predicates 仍需要 review，因為多種 entity types 都有效。
- Predicate changes 可能需要 candidate revalidation。

## 後續工作

- 實作 predicate registry data。
- 在 promotion 加入 predicate role validation。
- 增加使用 predicate role constraints 的 entity resolution scoring tests。
- Predicate definitions 變更時，加入 candidate revalidation。
