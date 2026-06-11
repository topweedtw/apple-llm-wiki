# ADR-002：Apple 產品 Entity Schema

## 狀態

Proposed

## 日期

2026-06-10

## 背景

ADR-001 將 Apple LLM Wiki 定義為 source-grounded knowledge base，並以 sources、entities、facts、pages、retrieval 與 freshness 組織知識。

下一個決策是如何將 Apple 相關概念建模為 entities。這很重要，因為 entity IDs 會成為 facts、citations、pages、comparisons、compatibility rules 與未來 ingestion jobs 的穩定骨架。

Apple 產品知識有幾個建模難點：

- 一條產品線可能包含多個世代，例如 iPhone、iPhone 15 series、iPhone 15 Pro。
- Apple 可能對同一產品使用 marketing names、technical identifiers、order numbers、model numbers 與 regional variants。
- 有些概念是實體產品，有些則是 chips、operating systems、features、events、accessories、services 或 support policies。
- 某些產品名稱可能被重複使用或語意模糊，例如 MacBook、iPad、Apple TV 或 HomePod。
- 許多有用回答需要關係資訊，例如「使用哪顆晶片」、「執行哪個作業系統」、「在哪場活動發表」、「與哪個配件相容」或「被哪個產品取代」。
- 有些 entities 會因 locale、region、carrier、storage tier 或 configuration 而不同，有些則是全球一致。

schema 必須保留穩定身份，但不能把每個規格、變體或價格都塞進 entity 本身。細節主張應放在 facts，而不是 entity records。

## 決策

採用 typed、stable、canonical 的 entity schema，並明確表示 relationships 與 alias metadata。

Entities 代表持久存在的物件或概念。Facts 代表關於 entities 的可驗證主張。Wiki pages 則呈現 entities 與 facts 的 curated views。

entity schema 遵守以下原則：

- Entity IDs 穩定且使用小寫。
- Entity IDs 使用 typed namespace prefix。
- Canonical entity names 適合人類閱讀，但不作為 primary key。
- Aliases、model numbers 與 search names 是 metadata，不是 identity。
- Region 與 configuration 差異只有在影響 identity 或 compatibility 時才建模為 variants。
- Current price 或 current sales status 這類 time-sensitive values 應建模為 facts，而非核心 entity 欄位。
- Entities 之間的 relationships 是 first-class 且有明確類型。

## Entity ID 格式

Entity IDs 使用以下格式：

```text
<namespace>:<slug>
```

範例：

```text
product-line:iphone
product-generation:iphone-15-series
product:iphone-15-pro
variant:iphone-15-pro-a3101
chip:a17-pro
os:ios-17
feature:dynamic-island
event:apple-event-2023-09
```

規則：

- 使用小寫 ASCII slug。
- 單字之間使用 hyphen。
- 優先使用穩定且不模糊的 Apple marketing names。
- 只有需要時才加入 disambiguating suffix。
- 不要把 mutable status 編進 ID。
- 當 facts 或 pages 已依賴 entity ID 後，不要重新命名該 ID。改用 aliases 或 redirects。

## 核心 Entity 類型

### ProductLine

長期存在的 Apple 產品家族。

範例：

- `product-line:iphone`
- `product-line:ipad`
- `product-line:mac`
- `product-line:apple-watch`
- `product-line:airpods`
- `product-line:vision-pro`

### ProductGeneration

產品線中的具名世代、系列或家族分組。

範例：

- `product-generation:iphone-15-series`
- `product-generation:macbook-pro-m3-2023`
- `product-generation:apple-watch-series-9`

當 Apple 或常見用法將某一組產品視為可比較的世代時，使用此類型。

### Product

具體上市販售的 Apple 產品。

範例：

- `product:iphone-15-pro`
- `product:iphone-15-pro-max`
- `product:macbook-air-13-m3`
- `product:apple-watch-ultra-2`
- `product:airpods-pro-2`

Product 應代表使用者常用來提問與比較的層級。

### Variant

需要獨立身份的地區、型號、configuration 或硬體變體。

範例：

- `variant:iphone-15-pro-a3101`
- `variant:macbook-air-13-m3-8cpu-8gpu`

只有在差異會影響相容性、硬體行為、法規支援或 source-backed specifications 時才使用 variants。不要為每個容量或顏色選項建立 variant，除非那些選項對 facts 或 retrieval 有必要。

### Chip

Apple 設計或 Apple 產品使用的晶片。

範例：

- `chip:a17-pro`
- `chip:m3`
- `chip:m3-pro`
- `chip:h2`
- `chip:u1`

### OperatingSystem

Apple 作業系統的主要版本。

範例：

- `os:ios-17`
- `os:ipados-17`
- `os:macos-sonoma`
- `os:watchos-10`
- `os:visionos-1`

Patch versions 只有在相容性或支援 facts 需要時才另外建模。

### Feature

具名能力、技術、設計元素或產品功能。

範例：

- `feature:dynamic-island`
- `feature:action-button`
- `feature:usb-c`
- `feature:face-id`
- `feature:promotion`

### Accessory

Apple 配件或相容附加裝置。

範例：

- `accessory:apple-pencil-pro`
- `accessory:magic-keyboard-ipad-pro`
- `accessory:magsafe-charger`

### Event

Apple 發表活動或 release event。

範例：

- `event:apple-event-2023-09`
- `event:wwdc-2024`

### SupportPolicy

支援、維修、軟體或服務政策。

範例：

- `support-policy:vintage-products`
- `support-policy:obsolete-products`
- `support-policy:ios-security-updates`

### CompatibilityRule

Entities 之間的持久相容性概念。

範例：

- `compatibility:apple-pencil-pro-ipad-pro-m4`
- `compatibility:ios-17-supported-iphones`

簡單的相容性規則也可以表示為 facts。當某條規則有自己的來源集合、說明、例外或生命週期時，才使用此 entity type。

## Base Entity Fields

每個 entity 都應支援以下欄位：

```yaml
id: product:iphone-15-pro
type: Product
canonical_name: iPhone 15 Pro
summary: >
  A 2023 Apple smartphone in the iPhone 15 series.
status: active
aliases:
  - iPhone 15 Pro
  - iPhone15,2
external_ids:
  apple_slug: iphone-15-pro
  model_numbers:
    - A3101
first_seen_at: 2023-09-12
last_seen_at: null
created_at: 2026-06-10
updated_at: 2026-06-10
source_ids:
  - source:apple-tech-specs-iphone-15-pro
```

必要 base fields：

- `id`
- `type`
- `canonical_name`
- `status`
- `created_at`
- `updated_at`

選用 base fields：

- `summary`
- `aliases`
- `external_ids`
- `first_seen_at`
- `last_seen_at`
- `source_ids`

## Entity Status

Entity status 描述 identity 層級的生命週期，不描述銷售狀態。

允許值：

- `active`
- `historical`
- `deprecated`
- `merged`
- `redirect`

Sales status、support status 與 availability 應該是 facts，因為它們會隨時間與 locale 變化。

`needs_review` 不得作為 production entity status。Entity review state 應放在 candidate entity records、review queues 與 review decisions。Production entity 必須使用上述 lifecycle statuses 之一。

## Relationships

Relationships 是 entities 之間有類型的連結。

範例：

```yaml
relationships:
  - type: belongs_to_line
    target: product-line:iphone
  - type: belongs_to_generation
    target: product-generation:iphone-15-series
  - type: uses_chip
    target: chip:a17-pro
  - type: introduced_at
    target: event:apple-event-2023-09
  - type: supports_os
    target: os:ios-17
  - type: has_feature
    target: feature:dynamic-island
```

常見 relationship types：

- `belongs_to_line`
- `belongs_to_generation`
- `has_variant`
- `variant_of`
- `uses_chip`
- `runs_os`
- `supports_os`
- `introduced_at`
- `replaced_by`
- `replaces`
- `has_feature`
- `compatible_with`
- `requires`
- `part_of`

當 relationship 對 retrieval 很重要且有來源支持時，relationship records 可以引用 source IDs。

## Locale 與 Region

Entities 預設應是 global。

只有在 identity 層級存在差異時，才使用 locale 或 region-specific variants，例如：

- 不同 model numbers 對應不同 cellular bands
- 不同法規造成硬體行為不同
- 隨附配件不同
- 以不同上市形式販售的產品

Locale-specific prices、trade-in values、sales pages 與 support wording 應建模為 facts 或 sources，而不是獨立 product entities。

## Aliases 與 Redirects

Aliases 用於搜尋與匹配。它們不建立新的 identities。

以下情況可以使用 redirect entities：

- 早期 entity ID 被替換。
- 常見名稱映射到 canonical entity。
- duplicate entity 被合併。

範例：

```yaml
id: product:iphone-fifteen-pro
type: Product
canonical_name: iPhone 15 Pro
status: redirect
redirect_to: product:iphone-15-pro
```

## Product Entity 範例

```yaml
id: product:iphone-15-pro
type: Product
canonical_name: iPhone 15 Pro
summary: >
  A 2023 iPhone model with A17 Pro, titanium design, USB-C, Action button,
  and Pro camera system.
status: historical
aliases:
  - iPhone 15 Pro
  - iPhone15,2
external_ids:
  model_numbers:
    - A2848
    - A3101
    - A3102
    - A3104
first_seen_at: 2023-09-12
source_ids:
  - source:apple-tech-specs-iphone-15-pro
relationships:
  - type: belongs_to_line
    target: product-line:iphone
  - type: belongs_to_generation
    target: product-generation:iphone-15-series
  - type: uses_chip
    target: chip:a17-pro
  - type: introduced_at
    target: event:apple-event-2023-09
  - type: has_feature
    target: feature:dynamic-island
  - type: has_feature
    target: feature:action-button
```

## Chip Entity 範例

```yaml
id: chip:a17-pro
type: Chip
canonical_name: A17 Pro
summary: >
  An Apple-designed chip introduced with iPhone 15 Pro models.
status: historical
aliases:
  - Apple A17 Pro
first_seen_at: 2023-09-12
relationships:
  - type: introduced_at
    target: event:apple-event-2023-09
```

## 影響

優點：

- 穩定的 entity IDs 讓 facts、pages 與 citations 更容易維護。
- schema 支援精確產品比較，不只依賴 prose。
- aliases 與 redirects 讓搜尋保持彈性，同時維持 canonical identity。
- variants 可以表示真實硬體差異，又避免 product model 爆炸。
- locale-specific 與 time-sensitive details 留在 facts 中，方便追蹤 freshness。

成本：

- Ingestion 需要先完成 entity resolution，才能附加 facts。
- 有些 Apple 命名模式需要人工審核。
- Variant 邊界需要判斷，未來可能需要修正。
- Entity redirects 與 merges 必須小心處理，避免破壞 references。

## 考慮過的替代方案

### 只有 Product 的 Entity Model

不採用，因為 Apple 知識也依賴 chips、operating systems、features、events、accessories 與 compatibility rules。

### 用 Page Title 當 Entity ID

不採用，因為名稱可能變動、衝突或因 locale 而不同。穩定 typed IDs 對 facts 與 retrieval 更安全。

### 完全正規化的 Variant Model

不採用，因為為每個顏色、容量與零售 configuration 建 entity 會讓 graph 太吵。Variants 只應在 identity-level differences 重要時存在。

## 後續工作

- 在 ADR-003 定義 fact schema。
- 在 ADR-004 定義 source trust levels。
- 定義 ingestion 的 entity resolution rules。
- 定義 redirect 與 merge procedures。
