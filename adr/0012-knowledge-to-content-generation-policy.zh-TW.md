# ADR-012：Knowledge-to-Content Generation Policy

## 狀態

Proposed

## 日期

2026-06-10

## 背景

Apple LLM Wiki 不只是儲存層。未來使用者可能希望從 wiki knowledge 生成題庫、短影片腳本、門市訓練腳本與 FABE 銷售腳本。

這些輸出屬於 application-layer content。它們必須從 facts、evidence 與 curated wiki pages 生成，同時不削弱 trust model。系統必須避免 unsupported marketing claims、stale recommendations，以及無法追溯到 source-backed knowledge 的內容。

## 決策

在 wiki 之上建立受治理的 content generation layer。

Generated content 只要包含 factual claims，就必須能追溯到 source-backed facts。Recommendations、教學結構與銷售 framing 可以由 LLM 生成，但必須和 facts 清楚分離。

## Supported Output Types

初始支援內容類型：

- question bank items
- short video scripts
- retail demonstration scripts
- FABE scripts
- training summaries

每種 output type 都應有 schema、citation rules、freshness rules 與 review level。

## Generation Pipeline

```text
content request
→ intent and audience definition
→ entity and fact retrieval
→ freshness and citation check
→ output schema selection
→ draft generation
→ validation
→ review or publish
```

除非內容明確標記為 draft and unreviewed，否則 LLM 不應直接從 raw source documents 生成。

## Question Bank Generation

題庫項目應包含：

- question type
- difficulty
- topic entity
- prompt
- choices, if applicable
- correct answer
- explanation
- source references
- freshness status

範例：

```yaml
type: single_choice
difficulty: basic
topic: product:iphone-15-pro
prompt: Which chip does iPhone 15 Pro use?
choices:
  - A16 Bionic
  - A17 Pro
  - M1
  - H2
answer: A17 Pro
explanation: iPhone 15 Pro uses the A17 Pro chip.
source_refs:
  - source:apple-tech-specs-iphone-15-pro
```

除非題目是 historical question，否則 question generation 必須避免 stale facts。

## Short Video Script Generation

短影片腳本應包含：

- platform
- target length
- audience
- hook
- narration
- visual cues
- key facts
- call to action
- factual claims 的 source references

Performance、battery life、compatibility 與 pricing 等 claims 必須由 facts 支持。

## Retail Demonstration Scripts

門市展示腳本應聚焦實用說明與 customer context。

必要欄位：

- customer scenario
- product entity
- key talking points
- demonstration steps
- likely customer questions
- evidence-backed claims
- stale 或 region-specific information 的 disclaimers

## FABE Scripts

FABE 代表：

- Feature
- Advantage
- Benefit
- Evidence

當 evidence 明確時，可以生成 FABE scripts。

範例：

```yaml
feature: A17 Pro chip
advantage: Higher graphics and compute capability
benefit: Better experience for gaming, video editing, and Pro workflows
evidence:
  - fact:iphone-15-pro:uses-chip
  - source:apple-tech-specs-iphone-15-pro
```

`Evidence` section 必須引用 facts 或 sources。Unsupported benefits 必須改寫成謹慎 guidance 或移除。

## Review Levels

允許的 review levels：

- `auto_publish`: 來自 historical facts 的低風險教育內容
- `needs_review`: sales scripts、recommendations、current product advice
- `blocked`: 缺少 evidence、使用 stale facts 或有 unsupported claims 的內容

Buying advice、current pricing、availability 與 sales scripts 通常應需要 review。

## Validation Rules

Generated content 必須通過：

- schema validation
- citation validation
- freshness validation
- unsupported claim detection
- locale check
- audience appropriateness check

## 影響

優點：

- Wiki 可支援實際 training 與 marketing workflows。
- Generated content 可追溯到 facts。
- Sales 與 education outputs 可以共用同一個可信知識庫。
- FABE scripts 變成 evidence-backed，而不是純話術。

成本：

- 需要 output schemas 與 validators。
- 部分 generated content 需要 review。
- Content generation 必須追蹤 freshness 與 locale。

## 考慮過的替代方案

### 讓使用者直接對 Wiki Prompt

不採用，因為 direct prompting 可能產生 unsupported、stale 或 uncited content。

### 將 Generated Content 視為 Facts

不採用，因為 generated scripts 是 outputs，不是 source-backed facts。它們可能包含 reasoning 與 framing，不應進入 fact layer。

## 後續工作

- 定義 question bank、video script、retail script 與 FABE output schemas。
- 定義 unsupported claim detection rules。
- 定義 generated content 的 review workflow。
- 定義 training 與 retail use 的 export formats。
