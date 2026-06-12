# ADR-001：LLM Wiki Apple 產品知識庫

## 狀態

Accepted（已由 ADR-023 取代）

> 已由 [ADR-023](0023-architecture-re-anchoring-markdown-llm-wiki.zh-TW.md) 取代。
> 架構再定錨為 Markdown LLM-Wiki。本 ADR 的 fact 與 citation 原則保留為品質護欄。

## 日期

2026-06-10

## 背景

我們希望建立一個專注於 Apple 產品的知識庫，用於 LLM 輔助搜尋、比較、摘要與問答。知識範圍包含 iPhone、iPad、Mac、Apple Watch、AirPods、Apple TV、HomePod、Vision Pro、配件、作業系統、晶片、產品規格、發表日期、價格、停產狀態、相容性與官方文件。

這個知識庫不應只是傳統 wiki，也不應只是向量資料庫。Apple 產品知識有幾個重要特性：

- 產品資訊會透過年度發表、作業系統更新與晶片世代快速變動。
- 規格高度結構化，例如螢幕、晶片、記憶體、連接埠、尺寸、重量、相機、感測器與連線能力。
- 許多問題需要跨產品、世代、晶片或作業系統比較。
- 來源品質很重要。Apple 官方技術規格、Newsroom、支援文件與開發者文件，應與二手來源分開看待。
- 有些資訊會過期，例如目前價格、販售狀態與軟體支援。
- LLM 回答需要來源引用與時間戳，避免產生過期或幻覺答案。

因此，專案需要一個 LLM 原生的 wiki 結構，使知識同時適合人類閱讀、模型檢索、來源追溯與長期維護。

## 決策

採用 source-grounded LLM Wiki 架構。

知識庫分為以下層次：

1. Source Layer
2. Entity Layer
3. Fact Layer
4. Page Layer
5. Retrieval Layer
6. Freshness Layer

## Source Layer

Source Layer 保存原始來源與擷取紀錄。

來源優先順序：

- Apple 官方技術規格頁
- Apple Newsroom
- Apple Support 文件
- Apple Developer 文件
- Apple 發表會影片與逐字稿
- Apple Store 產品頁
- 可信二手來源，例如 iFixit、EveryMac、MacRumors Buyer's Guide，但必須明確標記為 secondary source

每個來源應記錄：

- `source_id`
- `url`
- `title`
- `publisher`
- `source_type`
- `fetched_at`
- `published_at`
- `locale`
- `trust_level`
- `checksum` 或內容版本識別
- `license` 或使用說明

## Entity Layer

Apple 產品知識應以 entities 為中心，而不是只以文件為中心。

核心 entity 類型：

- `Product`
- `ProductLine`
- `ProductGeneration`
- `Chip`
- `OperatingSystem`
- `Feature`
- `Accessory`
- `Event`
- `SupportPolicy`
- `CompatibilityRule`

entity 範例：

- `product-line:iphone`
- `product-generation:iphone-15-series`
- `product:iphone-15-pro`
- `chip:a17-pro`
- `os:ios-17`
- `feature:dynamic-island`

Entity ID 應穩定且 canonical：

```text
product:iphone-15-pro
chip:a17-pro
os:ios-17
event:apple-event-2023-09
```

## Fact Layer

所有可回答問題的知識都應表示為可引用的 facts。

fact 範例：

```yaml
id: fact:iphone-15-pro:uses-chip
type: EntityRelationFact
subject: product:iphone-15-pro
predicate: uses_chip
object: chip:a17-pro
value: A17 Pro
value_type: entity
unit: null
valid_from: 2023-09-12
valid_to: null
source_refs:
  - source_id: source:apple-tech-specs-iphone-15-pro
    evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
confidence: high
freshness: historical
last_verified_at: 2026-06-10
```

這讓系統能回答：

- iPhone 15 Pro 使用哪顆晶片？
- 哪些產品使用 A17 Pro？
- 哪一款 iPhone 首次導入 A17 Pro？
- iPhone 15 Pro 和 iPhone 16 Pro 有什麼差異？

## Page Layer

Wiki pages 面向人類閱讀，也作為 LLM 的高品質 context。

頁面類型：

- Product Page
- Product Line Page
- Comparison Page
- Timeline Page
- Concept Page
- Buying Guide Page
- Compatibility Page

每個頁面應包含：

- 摘要
- canonical facts
- 規格
- 時間線
- 已知注意事項
- 來源引用
- freshness status
- 相關 entities

## Retrieval Layer

採用混合檢索：

- keyword search：用於型號、名稱、日期與精確規格
- vector search：用於語意問題
- graph traversal：用於相容性、世代與關係
- structured query：用於精確規格查詢

LLM 檢索順序應優先採用：

1. Entity matching
2. Fact lookup
3. Page retrieval
4. Source snippet retrieval
5. General semantic context

## Freshness Layer

每個 fact 和 page 都應有 freshness metadata。

freshness 狀態：

- `current`
- `possibly_stale`
- `deprecated`
- `historical`
- `disputed`

`needs_review` 是 candidate records 的 review status，不是 production fact freshness state。

價格、販售狀態與支援狀態應視為高變動資料，定期重新檢查。

## 資料模型草圖

```yaml
entity:
  id: product:iphone-15-pro
  type: Product
  name: iPhone 15 Pro
  product_line: product-line:iphone
  generation: product-generation:iphone-15-series
  first_seen_at: 2023-09-12
  released_at: 2023-09-22
  discontinued_at: null
  status: historical
  aliases:
    - iPhone 15 Pro
    - A3101
  related:
    - chip:a17-pro
    - os:ios-17
```

```yaml
wiki_page:
  id: page:product:iphone-15-pro
  entity_id: product:iphone-15-pro
  title: iPhone 15 Pro
  page_type: ProductPage
  summary: >
    iPhone 15 Pro is a 2023 Apple smartphone featuring the A17 Pro chip,
    titanium design, USB-C, and Action button.
  freshness: historical
  last_updated_at: 2026-06-10
  sources:
    - source:apple-tech-specs-iphone-15-pro
```

## 資料收集策略

資料收集分三個階段。

### 1. 官方來源優先

優先處理 Apple 官方來源：

- 技術規格頁
- Newsroom 發表文章
- Support 相容性文章
- Developer 文件

### 2. 結構化抽取

使用 parser 與 LLM-assisted extraction 的組合，抽取：

- 產品名稱
- 型號識別
- 發表日期
- 發售日期
- 晶片
- 螢幕
- 相機
- 連接埠
- 尺寸與重量
- OS 支援
- 價格與販售狀態

LLM 抽取出的 candidate facts 不得在沒有 source span 或 citation evidence 的情況下 promoted into production facts。

### 3. 審核與版本化

每次更新都應產生 diff：

- 新增 facts
- 變更 facts
- 棄用 facts
- 來源變更
- confidence 變更

## LLM 回答規則

知識庫應強制以下回答規則：

- 產品規格回答必須引用 source-backed facts。
- 涉及「latest」、「current」、「still supported」或「worth buying」的問題必須檢查 freshness。
- 非官方來源必須清楚標記。
- 來源衝突時必須呈現差異，不可悄悄合併。
- 沒有來源支持的主張不得用確定語氣表述。
- 比較型回答應優先使用 structured facts，而不是 raw semantic snippets。

## 影響

優點：

- 減少 LLM 幻覺。
- 支援精確產品比較。
- 支援歷史時間線查詢。
- 保留來源可追溯性。
- 可擴展到購買指南、相容性查詢與推薦工作流。

成本：

- 初期建模成本較高。
- Fact extraction 需要審核。
- 來源更新監控需要維護。
- Apple 頁面有地區差異，需要明確處理 locale。

## 考慮過的替代方案

### 純 Markdown Wiki

不採用，因為它適合人類閱讀，但不利於精確查詢、比較、版本追蹤與來源層級引用。

### 純向量資料庫

不採用，因為只靠語意檢索不適合處理規格、日期、相容性與數值比較。

### 只保存原始網頁

不採用，因為缺少 entity 與 fact 結構。LLM 每次查詢都需要重新理解原始內容，成本更高且可靠性較低。

## 後續 ADR

- ADR-002: Apple Product Entity Schema
- ADR-003: Fact Model and Citation Format
- ADR-004: Source Trust Levels
- ADR-005: Hybrid Retrieval Strategy
- ADR-006: Freshness Policy
- ADR-007: LLM Answer Citation Rules
