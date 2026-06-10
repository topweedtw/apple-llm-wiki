# ADR-006：Freshness Policy

## 狀態

Proposed

## 日期

2026-06-10

## 背景

有些 Apple facts 是歷史且穩定的；有些則經常變動。Release dates 與 chip names 在驗證後很少改變，但 current price、sales status、repair status、software support 與 availability 可能隨時改變。

LLM answers 必須知道 fact 是 current、historical、stale、disputed，還是 awaiting review。

## 決策

分別追蹤 facts、sources 與 pages 的 freshness。

Freshness 是 review 與 validity signal。它不同於 confidence、trust level 或 source authority。

## Freshness States

允許值：

- `current`
- `possibly_stale`
- `historical`
- `deprecated`
- `disputed`
- `needs_review`

### `current`

Fact 最近已驗證，且預期描述目前狀態。

用於最近檢查過的 current sales status、current OS support、active pricing 與 current compatibility。

### `possibly_stale`

Fact 可能已改變，需要驗證後才能自信使用。

當 TTL 到期，或問題詢問目前狀態但 last verification 已久時使用。

### `historical`

Fact 描述過去事件或穩定歷史屬性。

用於 announcement dates、original release dates、historical specs 與 discontinued product history。

### `deprecated`

Fact 不應再用於新回答，除非作為歷史。

當較新 fact supersedes 它，或 source 已 retired 時使用。

### `disputed`

相同 scope 與 time range 下來源互相衝突。

用於系統應呈現不確定性的情況。

### `needs_review`

Fact 已匯入或產生，但尚未核准。

用於 unreviewed ingestion output、low-confidence extraction 或 unknown sources。

## Freshness TTLs

預設 review intervals：

- Current price: 7 days
- Sales status: 14 days
- Trade-in value: 7 days
- OS support status: 30 days
- Compatibility: 90 days
- Repair, vintage, or obsolete status: 30 days
- Product specs after launch: 365 days
- Announcement and release dates: review 後無 TTL

TTL 到期應將 `current` 改為 `possibly_stale`，而不是刪除 fact。

## Review Triggers

以下情況重新檢查 freshness：

- Apple 發表新產品。
- Apple 發布 major OS versions。
- Apple 更新 support pages。
- Source checksum 改變。
- 偵測到 conflict。
- 使用者詢問 current-status question。
- Fact 被用於 buying recommendation。

## Source Freshness

Sources 應追蹤：

```yaml
fetched_at: 2026-06-10
last_verified_at: 2026-06-10
content_changed_at: null
checksum: null
freshness: current
```

如果 source 改變，從該 source 產生的 facts 應重新驗證。

## Page Freshness

Wiki pages 應從其 facts 繼承 freshness。

規則：

- 如果任何 cited fact 是 `disputed`，page 應顯示 disputed content。
- 如果 buying advice 使用 `possibly_stale` facts，page 應為 `possibly_stale`。
- 當所有 claims 都穩定時，historical pages 可維持 `historical`。

## Answer Behavior

回答 current questions 時，LLM 必須：

- 優先使用 `current` facts。
- 只有 `possibly_stale` facts 時需提醒。
- 避免用 `needs_review` facts 給出確定回答。
- 說明 `disputed` facts。
- 有幫助時使用精確 verification dates。

## 影響

優點：

- 減少 stale answers。
- 保留 historical facts 的價值。
- 讓 review work 可見。
- 支援可靠的 buying guidance。

成本：

- 需要 periodic refresh jobs。
- 需要依 fact type 設定 TTL。
- 有些 facts 在 review 前可能暫時降級。

## 考慮過的替代方案

### 單一 Last Updated Timestamp

不採用，因為一個 timestamp 無法區分 current、historical、disputed 與 unreviewed claims。

### 每次都即時重新抓來源

不採用，因為較慢、成本較高，而且仍需要 interpretation 與 review。

## 後續工作

- 實作 scheduled freshness checks。
- 加入 source checksum tracking。
- 定義 freshness dashboards 與 review queues。
