# ADR-010: Data Crawling and Extraction Technology Selection

## Status

Accepted

## Date

2026-06-10

## Context

ADR-008 defines the discovery and ingestion workflow. ADR-009 defines the historical product ingestion policy. The next decision is which crawling, parsing, extraction, storage, and indexing technologies should be used to implement those workflows.

The Apple LLM Wiki will ingest multiple source types:

- static Apple technical specification pages
- Apple Support articles
- Apple Newsroom pages
- Apple Store pages
- Apple Developer documentation
- archived Apple pages
- trusted secondary sources
- retailer, carrier, regulatory, and repair sources

The technology choices should keep the system reliable, auditable, and easy to evolve. The system should not use heavy browser automation when static fetching is enough, and it should not use LLM extraction when deterministic parsing is reliable.

## Decision

Use a layered crawling and extraction stack:

1. HTTP fetch first.
2. Browser automation only as fallback.
3. Deterministic parsers before LLM-assisted extraction.
4. Snapshot every fetched source.
5. Use queue-based ingestion.
6. Start with Postgres as the system of record.
7. Use Postgres full-text search and pgvector initially.
8. Add OpenSearch, Temporal, or graph databases only when scale or workflow complexity justifies them.

ADR-017 selects TypeScript on Node.js as the initial runtime. Therefore, the
initial implementation should use the Node.js tools listed in this ADR. Python
tools are retained as future alternatives for specialized workers or a later
runtime decision; they are not part of the first vertical slice.

## Fetching Strategy

### Static Pages

Use HTTP fetching for static or mostly static pages.

Recommended tools:

- Python: `httpx`, `requests`
- Node.js: `undici`, built-in `fetch`

For the initial ADR-017 runtime, use `undici` or built-in `fetch`.

Use for:

- Apple technical specifications
- Apple Support articles
- Apple Newsroom pages
- Apple Developer documentation
- trusted secondary source pages that render static HTML

### Dynamic Pages

Use Playwright only when HTTP fetch does not expose the needed content.

Use for:

- JavaScript-rendered Apple Store pages
- pages where important content is hydrated after load
- pages requiring browser behavior to expose content
- debugging extraction failures

Rule:

```text
Try HTTP fetch first. Escalate to Playwright only when the static snapshot is insufficient.
```

## Archived Sources

Use the Wayback Machine CDX API or equivalent archive APIs for archived official pages.

Store both original and archive metadata:

```yaml
original_url: https://www.apple.com/iphone-6/specs/
archive_url: https://web.archive.org/...
archive_timestamp: 20140919T000000Z
fetched_at: 2026-06-10
checksum: null
```

Archived official sources should follow ADR-009 and should not be treated as current-status evidence.

## Snapshot Storage

Every fetched source should produce a snapshot.

Snapshot contents:

- raw HTML or source document
- normalized text
- extracted metadata
- fetch timestamp
- HTTP status
- content checksum
- locale
- parser version
- fetcher type: `http` or `browser`

Initial storage:

- For the first vertical slice, store raw content and normalized text directly
  in the Postgres `source_snapshots` table alongside snapshot metadata. A
  single store keeps snapshots transactional with ingestion records and easy
  to load as test fixtures.
- Move raw content to local filesystem or object storage, keyed by checksum,
  when snapshot volume or size makes Postgres storage impractical. Snapshot
  metadata stays in Postgres for lookup and audit in all cases.

## Parsing Strategy

Use deterministic parsing before LLM extraction.

Recommended tools:

- Python: `BeautifulSoup`, `lxml`, `trafilatura`
- Node.js: `cheerio`, `linkedom`

For the initial ADR-017 runtime, use `cheerio` first. `linkedom` may be used
when DOM-like parsing is needed. Python parsing tools are alternatives, not
initial dependencies.

Use deterministic parsers for:

- specification tables
- headings and sections
- structured support articles
- known Apple page templates
- model number tables

Parser output should be candidate facts, entity references on those candidates (ADR-022), and evidence anchors.

## LLM-Assisted Extraction

Use LLM extraction only when deterministic parsing is insufficient.

Good use cases:

- Newsroom prose
- event summaries
- compatibility explanations
- support documents with complex wording
- evidence-anchor suggestions

Rules:

- LLM extraction produces candidates, not production facts.
- Extracted candidate facts should include evidence when available.
- Missing evidence must be recorded as a blocking candidate issue before review.
- Production facts must include evidence before promotion.
- LLM output must pass candidate intake validation before review and promotion validation before publication.
- Low-confidence extraction must remain in `candidate_facts` in state `needs_review`.

## Queue and Workflow

Crawling and ingestion should run through a job queue.

Initial acceptable options:

- simple Postgres-backed job table
- BullMQ with Redis for Node.js implementation
- Celery, RQ, or Dramatiq for Python implementation

For the first vertical slice, use the simple Postgres-backed job table selected
by ADR-017. BullMQ, Redis, Celery, RQ, Dramatiq, and Temporal remain upgrade
paths.

Upgrade to Temporal only when workflows require long-running retries, human approval steps, and complex orchestration.

## Storage and Indexing

Initial system of record:

- Postgres for sources, entities, production facts, candidate facts, evidence, reviews, and job state

Initial search:

- Postgres full-text search for keyword search
- pgvector for semantic search
- relational tables for graph traversal

Upgrade paths:

- OpenSearch when keyword search, faceting, or ranking needs exceed Postgres
- dedicated vector database when pgvector becomes insufficient
- graph database when relationship traversal becomes complex and performance-limited

## Rate Limits and Politeness

The crawler should:

- respect robots.txt where applicable
- use conservative concurrency
- retry with backoff
- identify itself with a clear user agent
- avoid scraping user-specific or authenticated content
- store errors instead of retrying indefinitely

## Validation Gates

Before publication, crawled and extracted data must pass:

- source classification
- snapshot creation
- entity resolution
- candidate issue validation
- fact schema validation
- evidence validation
- freshness assignment
- review approval when required

## Consequences

Benefits:

- Static fetching keeps ingestion fast and simple.
- Browser automation remains available without becoming the default.
- Parser-first extraction improves reliability.
- LLM-assisted extraction can help with messy prose while staying reviewable.
- Postgres-first storage keeps the initial system simpler.

Costs:

- Multiple extraction paths require clear routing.
- Parser maintenance is needed for page template changes.
- Some dynamic pages may still require Playwright.
- Review tooling is still required before publication.

## Alternatives Considered

### Playwright for Everything

Rejected because it is slower, more expensive, harder to scale, and unnecessary for many static Apple pages.

### LLM Extraction for Everything

Rejected because deterministic structured parsing is more reliable and easier to validate for specification tables and known templates.

### OpenSearch and Graph Database from Day One

Rejected because the initial system can be simpler with Postgres, full-text search, pgvector, and relational graph tables.

## Follow-up Work

- Define source fetcher interfaces.
- Define parser output schema.
- Define extraction prompt templates.
- Define snapshot storage layout.
- Define job queue schema.
- Define upgrade criteria for OpenSearch, Temporal, and graph databases.
