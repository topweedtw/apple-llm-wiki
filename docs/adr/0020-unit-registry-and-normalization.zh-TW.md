# ADR-020：Unit Registry and Normalization

## 狀態

Proposed

## 日期

2026-06-11

## 背景

ADR-003、ADR-008、ADR-011 與 ADR-016 都要求 production facts 使用 normalized units，但沒有定義允許的 unit values 或 alias rules。

如果沒有 unit registry，parsers 可能會對同一個單位輸出不同值，例如 `inch`、`in`、`inches` 或 `"`。Storage 與 memory units 也需要明確區分 decimal 與 binary semantics，例如 `GB` 與 `GiB`。

Promotion validation 需要 registry，才能判斷 candidate unit 已 normalized、需要 conversion，或必須留在 review。

## 決策

使用 controlled unit registry。Production facts 只能使用 registry 中的 canonical unit IDs，或在 predicate unitless 時使用 `null`。

Candidate facts 可以包含 unnormalized source units，但在 unit 對應到 canonical unit ID 前，必須記錄 `unnormalized_unit` issue。

Registry 應以 versioned data 實作，而不是 hard-coded parser logic。Parsers 可以使用 registry 做 normalization，promotion validation 必須根據 registry 檢查 production fact units。

## Canonical Unit Format

Canonical unit IDs 盡量使用 lowercase ASCII。

Rules：

- 常見 physical units 使用 singular names，例如 `inch`
- 只有大小寫具技術意義時使用 established case-sensitive symbols，例如 `GB`、`TB`、`GiB` 與 `Hz`
- 不使用 punctuation aliases 作為 canonical IDs
- 不將 display formatting 編入 unit ID
- entity、enum、boolean、date、datetime 與 unitless string facts 使用 `null`，除非 predicate 要求 unit

## Initial Unit Registry

Length and dimensions：

```yaml
- id: inch
  aliases: ["in", "in.", "inch", "inches", "\""]
- id: millimeter
  aliases: ["mm", "millimeter", "millimeters"]
- id: centimeter
  aliases: ["cm", "centimeter", "centimeters"]
- id: meter
  aliases: ["m", "meter", "meters"]
```

Mass：

```yaml
- id: gram
  aliases: ["g", "gram", "grams"]
- id: kilogram
  aliases: ["kg", "kilogram", "kilograms"]
- id: ounce
  aliases: ["oz", "ounce", "ounces"]
- id: pound
  aliases: ["lb", "lbs", "pound", "pounds"]
```

Storage and memory：

```yaml
- id: GB
  aliases: ["GB", "gb", "gigabyte", "gigabytes"]
  semantics: decimal_gigabyte
- id: TB
  aliases: ["TB", "tb", "terabyte", "terabytes"]
  semantics: decimal_terabyte
- id: GiB
  aliases: ["GiB", "gib", "gibibyte", "gibibytes"]
  semantics: binary_gibibyte
- id: TiB
  aliases: ["TiB", "tib", "tebibyte", "tebibytes"]
  semantics: binary_tebibyte
```

Apple product specifications 通常使用 decimal `GB` 與 `TB` 表示 marketed storage capacities，除非 source 明確使用 binary units。

Display, frequency, and electrical：

```yaml
- id: Hz
  aliases: ["Hz", "hz", "hertz"]
- id: kHz
  aliases: ["kHz", "khz", "kilohertz"]
- id: MHz
  aliases: ["MHz", "mhz", "megahertz"]
- id: GHz
  aliases: ["GHz", "ghz", "gigahertz"]
- id: nit
  aliases: ["nit", "nits"]
- id: watt
  aliases: ["W", "w", "watt", "watts"]
- id: watt_hour
  aliases: ["Wh", "wh", "watt-hour", "watt hour", "watt-hours"]
```

Money：

```yaml
- id: USD
  aliases: ["USD", "$", "US dollar", "US dollars"]
- id: TWD
  aliases: ["TWD", "NT$", "NTD", "New Taiwan dollar"]
- id: EUR
  aliases: ["EUR", "€", "euro", "euros"]
- id: JPY
  aliases: ["JPY", "¥", "yen"]
```

Money facts 在 claim region-specific 時，也必須帶 locale 或 region。

Counts and ratios：

```yaml
- id: count
  aliases: ["count", "item", "items"]
- id: percent
  aliases: ["%", "percent", "percentage"]
- id: megapixel
  aliases: ["MP", "mp", "megapixel", "megapixels"]
```

## Unit Alias Handling

Parser output 應在 `raw_value` 或 evidence 中保留 source wording，並透過 registry normalize `unit`。

範例：

```yaml
raw_value: 6.1-inch display
value: 6.1
unit: inch
```

```yaml
raw_value: 128GB storage
value: 128
unit: GB
```

```yaml
raw_value: 120 Hz refresh rate
value: 120
unit: Hz
```

## Conversion Rules

Unit conversion 應採 conservative 策略。

允許 automatic conversions：

- `in`、`inches` 與 `"` to `inch`
- `mm` to `millimeter`
- `g` to `gram`
- `kg` to `kilogram`
- registry 中列出的 casing 與 spelling aliases

不要 automatic convert：

- decimal 與 binary storage units，例如 `GB` 與 `GiB`
- 不同 currencies
- 不同 length systems，例如 `inch` 與 `millimeter`，除非 predicate-specific conversion policy 已定義
- marketed storage 與 actual usable storage

當 source 提供多個 units，選擇最符合 predicate vocabulary 的 unit，並在 evidence 中保留 source wording。

## Registry Records

每個 unit registry record 應支援：

```yaml
id: inch
dimension: length
aliases:
  - in
  - inches
  - "\""
canonical_symbol: in
display_name: inch
conversion_group: length
status: active
notes: null
```

Status values：

- `active`
- `deprecated`
- `needs_review`

Deprecated units 不得用於新的 production facts。

## Validation Rules

Candidate intake validation：

- 可以接受 missing 或 unnormalized units，但必須記錄 `unnormalized_unit` issue
- 必須在 `raw_value`、evidence 或 snapshot context 保留 source wording
- 只有 candidate 無法 review 時，才 reject unknown units

Promotion validation：

- production fact units 必須是 `null` 或 active registry unit ID
- unit 必須符合 predicate vocabulary
- unitless predicates 必須使用 `unit: null`
- decimal 與 binary storage units 不得 silently converted
- money facts 在 region-specific 時必須包含 locale 或 region

## 影響

Benefits：

- Parsers 共用同一組 canonical unit IDs。
- Promotion validation 有具體 rule set。
- Storage、memory、money 與 display facts 避免 silent semantic drift。
- Source wording 可透過 `raw_value` 與 evidence audit。

Costs：

- Registry 必須隨新 unit types 出現而維護。
- Predicate definitions 最終必須宣告 allowed unit dimensions。
- 有些 facts 會需要 review，而不是 automatic unit conversion。

## 後續工作

- 將 unit registry data 加入 implementation。
- 定義 predicate-to-unit-dimension rules。
- 增加 parser tests，涵蓋 `in`、`"`、`GB`、`GiB`、`Hz` 與 `%` 等 aliases。
- 增加 unknown 與 deprecated units 的 promotion validation tests。
