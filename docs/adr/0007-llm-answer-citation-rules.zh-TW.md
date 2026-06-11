# ADR-007：LLM Answer Citation Rules

## 狀態

Accepted

## 日期

2026-06-10

## 背景

Apple LLM Wiki 的目的，是讓 LLM 能用 grounded、verifiable information 回答。即使已經有良好的 entities、facts、sources、retrieval 與 freshness metadata，answer layer 仍需要規則。沒有回答規則時，模型可能過度確定、漏掉 citations、忽略 stale facts，或合併互相衝突的 evidence。

## 決策

LLM answers 必須根據 retrieved facts 與 evidence-backed citations 產生。

Answer layer 必須保留 uncertainty、source quality、freshness 與 locale boundaries。

## Core Rules

1. 引用來自知識庫的 factual claims。
2. 使用 evidence-backed citations，而不只是 source URLs。
3. 優先使用 official 與 reviewed sources。
4. 對 current、latest、still supported、available、pricing 與 buying-advice questions 檢查 freshness。
5. 不要把 locale-specific facts 當成 global。
6. 不要悄悄合併 conflicting facts。
7. 不要在 final answers 使用 candidate records。當只有 `possibly_stale` production facts 可用時，必須帶 freshness context 謹慎回答。
8. 區分 source-backed facts 與 recommendations 或 reasoning。

## Citation Requirements

以下內容必須引用：

- Product specifications
- Release and announcement dates
- Compatibility claims
- OS support claims
- Pricing、sales status 與 availability
- Repair、vintage 或 obsolete status
- 基於 factual differences 的 comparisons
- 來自 secondary sources 的 claims

以下內容可選擇性引用：

- 完全由已引用 facts 組成的 high-level summaries
- 明顯的 navigation statements
- 重述 user-provided information

## Citation Rendering

內部 references 應使用 fact 與 evidence IDs。面向人類的回答應呈現可讀 source names。

回答範例：

```text
iPhone 15 Pro uses the A17 Pro chip, according to Apple's technical specifications.
```

附帶 citation metadata 應指向：

```yaml
fact_id: fact:iphone-15-pro:uses-chip
source_id: source:apple-tech-specs-iphone-15-pro
evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
```

## Freshness-Sensitive Answers

對包含「latest」、「current」、「now」、「still sold」、「supported」、「worth buying」或類似語意的問題：

- 有 `current` facts 時優先使用。
- 只有 `possibly_stale` facts 時，說明 last verification date。
- Freshness unknown 時，說明需要驗證。
- 不要用 stale pricing 或 availability data 做 buying recommendations。

## Conflict Answers

當 facts 是 `disputed`：

- 說明來源不一致。
- 解釋 competing claims。
- 適當時優先使用 official sources。
- 除非 source policy 明確支持，否則不要武斷選出勝者。

## Comparison Answers

Comparison answers 應：

- 盡量使用 shared predicates。
- 區分 factual differences 與 recommendations。
- 為 key differences 加 citations。
- 不要把 unavailable fields 當成已知來比較。

## Recommendation Answers

Recommendations 應標記為 reasoning，而不是 source facts。

Recommendation 可以使用 facts 作為輸入，但最終建議應說明 assumptions，例如 budget、workload、region、freshness 與 tradeoffs。

## Insufficient Evidence

如果 retrieved context 沒有足夠 evidence：

- 說明缺少什麼。
- 避免創造 facts。
- 建議需要哪種 source 或 fact type。

## 影響

優點：

- Answers 保持 auditable。
- 使用者能區分 facts 與 advice。
- Stale 或 disputed information 較不容易被當成確定資訊。
- 系統可支援高信任度產品比較與購買建議。

成本：

- Answers 可能更謹慎。
- Retrieval 必須提供 evidence，而不只是 summaries。
- UI 與 API responses 需要支援 citation formatting。

## 考慮過的替代方案

### 讓 LLM 自行決定何時引用

不採用，因為 citation behavior 必須 predictable 且 testable。

### 每句話都引用

不採用，因為會讓答案太吵。規則應引用有意義的 factual claims 與 key comparison points。

## 後續工作

- 定義 cited answers 的 response schemas。
- 增加 stale、disputed 與 insufficient-evidence answers 的測試。
- 定義 citations 與 freshness warnings 的 UI rendering。
