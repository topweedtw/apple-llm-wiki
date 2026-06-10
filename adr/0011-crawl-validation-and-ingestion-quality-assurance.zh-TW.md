# ADR-011：Crawl Validation and Ingestion Quality Assurance

## 狀態

Proposed

## 日期

2026-06-10

## 背景

Apple LLM Wiki 依賴 crawled and extracted source data。爬蟲成功跑完並不夠。系統必須能證明它抓到正確頁面、保存有用 snapshot、抽出正確欄位、附上 evidence、正確解析 entities，並產生 valid facts。

如果沒有 quality gates，wiki 可能累積錯誤 facts、stale data、broken citations、duplicated sources，或掛到錯誤 Apple 產品的 facts。

## 決策

透過分層 automated checks 加 human review gates 驗證 ingestion。

系統應測試完整資料路徑：

```text
source page
→ snapshot
→ parser output
→ candidate facts
→ evidence
→ entity resolution
→ validated facts
→ wiki page
→ cited answer
```

Candidate fact 必須通過必要 validation 後才能 publish。

## Validation Layers

### Source Fetch Validation

檢查：

- HTTP status 可接受。
- final URL 符合預期。
- page title 符合 source intent。
- locale 已偵測。
- content 非空。
- checksum 已保存。
- snapshot 已建立。

失敗時阻擋 ingestion。

### Snapshot Regression Validation

重要 sources 應有 fixture snapshots。

Fixtures 用於測試 parser changes 是否仍能處理已知 Apple page structures。

範例：

```text
fixtures/apple/iphone-15-pro-tech-specs.html
fixtures/apple/iphone-15-pro-tech-specs.expected.yaml
```

### Parser Golden Tests

Parser output 應與 expected structured results 比對。

範例：

```yaml
expected:
  product: iPhone 15 Pro
  chip: A17 Pro
  connector: USB-C
  display_size:
    value: 6.1
    unit: inch
```

Parser regressions 應在 production ingestion jobs 執行前 fail。

### Evidence Validation

每個 production fact 都必須 reference evidence。

必要 evidence fields：

- `source_id`
- `evidence_id`
- `locator`
- `quote` 或 equivalent source span
- `retrieved_at`

沒有 evidence 的 facts 必須維持 `needs_review` 或 rejected。

### Entity Resolution Validation

Entity resolution 必須確認 extracted names 能映射到 canonical entity IDs。

範例：

```text
iPhone 15 Pro → product:iphone-15-pro
A17 Pro → chip:a17-pro
iPhone15,2 → product:iphone-15-pro
```

Ambiguous matches 不得 auto-publish。

### Fact Schema Validation

Facts 必須通過 schema validation：

- required fields exist
- predicate is allowed
- value type matches predicate
- unit is normalized
- locale is valid
- freshness is set
- confidence is set
- source refs point to existing evidence

### Cross-Source Consistency Validation

當多個 sources 描述同一 fact，系統應比對 values。

結果：

- 相同 value：merge 或加入 supporting evidence
- 不同 locale 或 time range：保留為 separate facts
- 相同 scope 但 value 衝突：標記 `disputed`

### End-to-End Answer Validation

系統應測試代表性問題。

範例：

```text
Question: What chip does iPhone 15 Pro use?
Expected answer: A17 Pro
Expected citation: Apple technical specifications evidence
```

測試應驗證 answer value、citation presence 與 source quality。

## Quality Gates

Publication 前的必要 gates：

1. source fetch validation
2. snapshot creation
3. parser or extraction validation
4. evidence validation
5. entity resolution validation
6. fact schema validation
7. freshness assignment
8. risky 或 ambiguous data 需要 review approval

## Metrics

追蹤：

- fetch success rate
- parser success rate
- extraction confidence distribution
- entity resolution ambiguity rate
- evidence coverage
- fact validation failure rate
- disputed fact count
- stale fact count
- review queue age

## 影響

優點：

- Crawler correctness 變得可衡量。
- Parser changes 可以安全測試。
- Evidence coverage 改善 citation reliability。
- 錯誤或有歧義的 facts 會在 publication 前被阻擋。

成本：

- 需要維護 fixtures。
- 增加 ingestion latency。
- 需要 validation tooling 與 review queues。

## 考慮過的替代方案

### 只測爬蟲有沒有跑完

不採用，因為 successful crawling 不代表 extraction 或 citation quality 正確。

### 只有 Manual Review，沒有 Automated Tests

不採用，因為 manual review 無法 scale，也無法穩定抓出 parser regressions。

## 後續工作

- 定義 fixture directory structure。
- 定義 expected-output YAML schema。
- 增加 ingestion validation command。
- 增加 end-to-end cited answer tests。
