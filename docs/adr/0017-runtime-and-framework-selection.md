# ADR-017: Runtime and Framework Selection

## Status

Proposed

## Date

2026-06-11

## Context

The implementation plan still leaves runtime, web framework, database access,
migration tooling, API style, CLI commands, and background job execution as open
decisions.

The first implementation should support:

- source registration and ingestion commands
- HTTP fetching and deterministic HTML parsing
- candidate fact validation and promotion
- Postgres migrations and canonical writes
- index outbox processing
- a small cited-answer API
- parser and promotion tests

The project should avoid a polyglot architecture at the start. A single runtime
keeps the first vertical slice easier to test, deploy, and understand.

## Decision

Use TypeScript on the current Node.js Active LTS release as the initial runtime.

Use the following initial framework choices:

- Web API: Fastify
- Runtime language: TypeScript
- Package manager: pnpm
- Schema validation: Zod
- Database: Postgres
- Database access: Kysely with `pg`
- Migrations: SQL migration files run by a thin TypeScript migration runner
- Test runner: Vitest
- CLI commands: Commander
- HTTP fetching: `undici` or built-in `fetch`
- HTML parsing: Cheerio
- Browser fallback: Playwright only when static fetch is insufficient
- Background jobs: start with Postgres-backed job and outbox tables

Do not introduce Bun, Redis, BullMQ, Temporal, OpenSearch, a graph database, or
a separate Python ingestion service in the first vertical slice.

## Package Management

Use pnpm as the package manager.

Rules:

- commit `pnpm-lock.yaml`
- use Node.js, not Bun, as the runtime for the first vertical slice
- define package scripts for development, tests, migrations, CLI commands, and
  type checking
- keep dependency additions explicit and scoped to the current implementation
  phase

pnpm is selected because it provides a stable lockfile, efficient installs, and
a straightforward path to workspaces if the project later splits API, CLI,
worker, or shared packages.

## Application Boundaries

The initial application should be organized around explicit services rather
than framework-specific controllers.

Suggested boundaries:

- `api`: Fastify routes and HTTP response schemas
- `cli`: command entrypoints for ingestion, review, promotion, and rebuilds
- `db`: migrations, query helpers, and transaction helpers
- `domain`: entities, facts, evidence, freshness, and state-machine types
- `ingestion`: source fetchers, snapshots, parsers, and candidate writers
- `review`: review decisions, issue state changes, and promotion rules
- `retrieval`: entity matching, fact lookup, evidence hydration, and context
  building
- `indexing`: outbox event processing, projections, rebuilds, and drift checks

Framework code should call domain services. Domain services should not depend on
Fastify route objects.

## API Style

Start with REST endpoints and CLI commands.

Initial HTTP endpoints:

- `GET /health`
- `POST /answer`

Initial CLI commands:

- `source register`
- `source fetch`
- `source ingest-fixture`
- `candidate validate`
- `review approve`
- `fact promote`
- `index process`
- `index rebuild`
- `index check-drift`

GraphQL, gRPC, and public SDKs are out of scope for the first implementation.

## Database and Migrations

Postgres remains the system of record. Migrations should be plain and reviewable.

Use checked-in SQL migration files managed by a thin TypeScript migration
runner. Use Kysely for application query building, not as the primary migration
DSL.

Migration rules:

- migration files live in a dedicated migrations directory
- migration filenames must be ordered and stable
- migrations must be checked into the repository
- migrations must be deterministic
- destructive migrations require explicit follow-up ADR or migration notes
- enum changes must be backward-compatible or include data migration steps
- tests should be able to apply migrations against a local test database

Kysely is used for type-safe query building, but database constraints and SQL
migration files remain the source of truth for critical invariants such as
production fact requirements, candidate states, and outbox event states.

## Validation

Use Zod for boundary validation:

- HTTP request and response schemas
- CLI input validation
- parser output validation
- candidate fact intake validation

Do not rely only on TypeScript types for runtime correctness. Critical
promotion rules must be enforced by service code and database constraints.

## Jobs and Outbox

Start with Postgres-backed jobs and `index_outbox` events.

This matches ADR-015 and keeps the first implementation simple:

```text
canonical write transaction
 -> index_outbox event
 -> CLI or worker command processes event
 -> projection updated
```

Long-running orchestration tools may be revisited only after ingestion, review,
promotion, and rebuild commands exist.

## Parser Strategy

Use deterministic TypeScript parsers for the first technical specification page:

- `fetch` or `undici` for HTTP
- Cheerio for static HTML parsing
- Playwright only for pages whose needed content is unavailable from static
  snapshots

LLM-assisted extraction remains behind an interface and is not required for the
first vertical slice.

## Consequences

Benefits:

- One language and runtime for API, ingestion, CLI, jobs, and tests.
- Fastify keeps the HTTP layer lightweight.
- Kysely keeps SQL explicit while improving type safety.
- Zod provides runtime validation at boundaries.
- Postgres-backed jobs align with the outbox and rebuild ADRs.

Costs:

- Python parsing libraries such as BeautifulSoup, lxml, and trafilatura are not
  used initially.
- Complex workflow orchestration is deferred.
- Some extraction tasks may later justify a dedicated worker runtime or service.

## Alternatives Considered

### Python FastAPI

Python has excellent parsing and data tooling. It was not selected for the
initial runtime because the project also needs a typed API, CLI, state-machine
services, and frontend-adjacent response contracts. TypeScript keeps those
contracts close to the API and test layer.

### Polyglot TypeScript API and Python Ingestion

Rejected for the first vertical slice because it creates deployment, testing,
serialization, and ownership overhead before the ingestion model is proven.

### Full Queue and Workflow Stack from Day One

Rejected because ADR-010 and ADR-015 favor a Postgres-first implementation until
workflow complexity requires Redis, BullMQ, Temporal, or another orchestrator.

## Follow-up Work

- Update the implementation plan open decisions.
- Scaffold TypeScript project structure.
- Add pnpm, Fastify, Zod, Kysely, Vitest, Commander, Cheerio, and Playwright
  only when implementation begins.
- Define package scripts for migrations, tests, CLI commands, and development
  server.
