# ADR-017：Runtime and Framework Selection

## 狀態

Accepted

## 日期

2026-06-11

## 背景

Implementation plan 仍將 runtime、web framework、database access、migration tooling、API style、CLI commands 與 background job execution 留為 open decisions。

第一版 implementation 應支援：

- source registration 與 ingestion commands
- HTTP fetching 與 deterministic HTML parsing
- candidate fact validation 與 promotion
- Postgres migrations 與 canonical writes
- index outbox processing
- 小型 cited-answer API
- parser 與 promotion tests

專案初期應避免 polyglot architecture。單一 runtime 會讓第一條 vertical slice 更容易測試、部署與理解。

## 決策

初始 runtime 使用 Node.js 26.x 上的 TypeScript。

刻意選用 Node.js 26.x，即使在本決策當下它仍屬 Current release line、尚未轉為
Active LTS。專案會 pin major version（26.x）以確保本機與 CI build 的可重現性，
並在 26.x 轉為 Active LTS、或有更新的 LTS 值得升級時，重新檢視此 pin。

初始 framework choices：

- Web API：Fastify
- Runtime language：TypeScript
- Package manager：pnpm
- Schema validation：Zod
- Database：Postgres
- Database access：Kysely with `pg`
- Migrations：由 thin TypeScript migration runner 執行 SQL migration files
- Test runner：Vitest
- CLI commands：Commander
- HTTP fetching：`undici` 或 built-in `fetch`
- HTML parsing：Cheerio
- Browser fallback：只有 static fetch 不足時才使用 Playwright
- Background jobs：先使用 Postgres-backed job 與 outbox tables

第一條 vertical slice 不引入 Bun、Redis、BullMQ、Temporal、OpenSearch、graph database，或獨立 Python ingestion service。

## Package Management

使用 pnpm 作為 package manager。

Rules：

- commit `pnpm-lock.yaml`
- 第一條 vertical slice 使用 Node.js，而不是 Bun，作為 runtime
- 定義 development、tests、migrations、CLI commands 與 type checking 的 package scripts
- dependency additions 必須明確，且限縮在目前 implementation phase 所需範圍

選擇 pnpm 是因為它提供穩定 lockfile、高效率安裝，且如果未來專案拆分 API、CLI、worker 或 shared packages，也有清楚的 workspaces 路徑。

## Application Boundaries

初始 application 應圍繞明確 services 組織，而不是依賴 framework-specific controllers。

建議 boundaries：

- `api`：Fastify routes 與 HTTP response schemas
- `cli`：ingestion、review、promotion 與 rebuilds 的 command entrypoints
- `db`：migrations、query helpers 與 transaction helpers
- `domain`：entities、facts、evidence、freshness 與 state-machine types
- `ingestion`：source fetchers、snapshots、parsers 與 candidate writers
- `review`：review decisions、issue state changes 與 promotion rules
- `retrieval`：entity matching、fact lookup、evidence hydration 與 context building
- `indexing`：outbox event processing、projections、rebuilds 與 drift checks

Framework code 應呼叫 domain services。Domain services 不應依賴 Fastify route objects。

## API Style

先使用 REST endpoints 與 CLI commands。

初始 HTTP endpoints：

- `GET /health`
- `POST /answer`

初始 CLI commands：

- `entity create`
- `source register`
- `source fetch`
- `source ingest-fixture`
- `candidate validate`
- `review approve`
- `fact promote`
- `index process`
- `index rebuild`
- `index check-drift`

`review` command group 會展開為 ADR-019 定義的完整 review operations。

GraphQL、gRPC 與 public SDKs 不屬於第一版 implementation 範圍。

## Database and Migrations

Postgres 仍是 system of record。Migrations 應保持 plain and reviewable。

使用 checked-in SQL migration files，並由 thin TypeScript migration runner 管理。Kysely 用於 application query building，不作為 primary migration DSL。

Migration rules：

- migration files 放在 dedicated migrations directory
- migration filenames 必須 ordered and stable
- migrations 必須 checked into repository
- migrations 必須 deterministic
- destructive migrations 需要明確 follow-up ADR 或 migration notes
- enum changes 必須 backward-compatible，或包含 data migration steps
- tests 應能對 local test database 套用 migrations

Kysely 用於 type-safe query building，但 database constraints 與 SQL migration files 仍是 critical invariants 的 source of truth，例如 production fact requirements、candidate states 與 outbox event states。

## Validation

使用 Zod 做 boundary validation：

- HTTP request and response schemas
- CLI input validation
- parser output validation
- candidate fact intake validation

不要只依賴 TypeScript types 確保 runtime correctness。Critical promotion rules 必須由 service code 與 database constraints 強制執行。

## Jobs and Outbox

先使用 Postgres-backed jobs 與 `index_outbox` events。

這符合 ADR-015，並保持第一版 implementation 簡單：

```text
canonical write transaction
 -> index_outbox event
 -> CLI or worker command processes event
 -> projection updated
```

Long-running orchestration tools 只有在 ingestion、review、promotion 與 rebuild commands 存在之後才重新評估。

## Parser Strategy

第一個 technical specification page 使用 deterministic TypeScript parsers：

- `fetch` 或 `undici` 用於 HTTP
- Cheerio 用於 static HTML parsing
- 只有 required content 無法從 static snapshots 取得時才使用 Playwright

LLM-assisted extraction 仍放在 interface 後面，第一條 vertical slice 不需要它。

## 影響

Benefits：

- API、ingestion、CLI、jobs 與 tests 使用同一 language and runtime。
- Fastify 讓 HTTP layer 保持 lightweight。
- Kysely 讓 SQL explicit，同時提升 type safety。
- Zod 提供 boundary runtime validation。
- Postgres-backed jobs 符合 outbox 與 rebuild ADRs。

Costs：

- 初期不使用 BeautifulSoup、lxml、trafilatura 等 Python parsing libraries。
- Complex workflow orchestration 延後。
- 某些 extraction tasks 之後可能需要 dedicated worker runtime 或 service。

## 考慮過的替代方案

### Python FastAPI

Python 有很好的 parsing 與 data tooling。初期未選擇它，是因為專案也需要 typed API、CLI、state-machine services 與接近 frontend 的 response contracts。TypeScript 讓這些 contracts 更靠近 API 與 test layer。

### Polyglot TypeScript API and Python Ingestion

第一條 vertical slice 不採用，因為 ingestion model 尚未被證明前，就會增加 deployment、testing、serialization 與 ownership overhead。

### 一開始就使用完整 Queue and Workflow Stack

不採用，因為 ADR-010 與 ADR-015 偏好 Postgres-first implementation，直到 workflow complexity 真的需要 Redis、BullMQ、Temporal 或其他 orchestrator。

## 後續工作

- 更新 implementation plan open decisions。
- Scaffold TypeScript project structure。
- Implementation 開始時再加入 pnpm、Fastify、Zod、Kysely、Vitest、Commander、Cheerio 與 Playwright。
- 定義 migrations、tests、CLI commands 與 development server 的 package scripts。
