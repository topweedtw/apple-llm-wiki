# ADR-001: LLM Wiki Apple Product Knowledge Base

## Status

Accepted

## Date

2026-06-10

## Context

We want to build a knowledge base focused on Apple products for LLM-assisted search, comparison, summarization, and question answering. The knowledge base should cover iPhone, iPad, Mac, Apple Watch, AirPods, Apple TV, HomePod, Vision Pro, accessories, operating systems, chips, product specifications, announcement dates, pricing, discontinuation status, compatibility, and official documentation.

This knowledge base should not be only a traditional wiki, and it should not be only a vector database. Apple product knowledge has several important characteristics:

- Product information changes frequently through yearly releases, operating system updates, and chip generations.
- Specifications are highly structured, including display, chip, memory, ports, dimensions, weight, cameras, sensors, and connectivity.
- Many questions require comparison across products, generations, chips, or operating systems.
- Source quality matters. Official Apple technical specifications, Newsroom posts, support documents, and developer documentation should be treated differently from secondary sources.
- Some information becomes stale, such as current pricing, sales status, and software support.
- LLM answers need source references and timestamps to avoid stale or hallucinated answers.

Therefore, the project needs an LLM-native wiki structure where knowledge is readable by humans, retrievable by models, traceable to sources, and maintainable over time.

## Decision

Use a source-grounded LLM Wiki architecture.

The knowledge base will be organized into the following layers:

1. Source Layer
2. Entity Layer
3. Fact Layer
4. Page Layer
5. Retrieval Layer
6. Freshness Layer

## Source Layer

The Source Layer stores original sources and ingestion records.

Source priority:

- Apple official technical specification pages
- Apple Newsroom
- Apple Support documents
- Apple Developer documentation
- Apple event videos and transcripts
- Apple Store product pages
- Trusted secondary sources, such as iFixit, EveryMac, and MacRumors Buyer's Guide, with explicit secondary-source labeling

Each source should record:

- `source_id`
- `url`
- `title`
- `publisher`
- `source_type`
- `fetched_at`
- `published_at`
- `locale`
- `trust_level`
- `checksum` or content version identifier
- `license` or usage note

## Entity Layer

Apple product knowledge should be centered on entities rather than only documents.

Core entity types:

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

Example entities:

- `product-line:iphone`
- `product-generation:iphone-15-series`
- `product:iphone-15-pro`
- `chip:a17-pro`
- `os:ios-17`
- `feature:dynamic-island`

Entity IDs should be stable and canonical:

```text
product:iphone-15-pro
chip:a17-pro
os:ios-17
event:apple-event-2023-09
```

## Fact Layer

All answerable knowledge should be represented as citeable facts.

Example fact:

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

This enables questions such as:

- What chip does iPhone 15 Pro use?
- Which products use A17 Pro?
- Which iPhone first introduced A17 Pro?
- How does iPhone 15 Pro compare with iPhone 16 Pro?

## Page Layer

Wiki pages are for human reading and high-quality LLM context.

Page types:

- Product Page
- Product Line Page
- Comparison Page
- Timeline Page
- Concept Page
- Buying Guide Page
- Compatibility Page

Each page should include:

- Summary
- Canonical facts
- Specifications
- Timeline
- Known caveats
- Source references
- Freshness status
- Related entities

## Retrieval Layer

Use hybrid retrieval:

- Keyword search for model numbers, names, dates, and exact specs
- Vector search for semantic questions
- Graph traversal for compatibility, generations, and relationships
- Structured queries for precise specification lookup

LLM retrieval should prefer this order:

1. Entity matching
2. Fact lookup
3. Page retrieval
4. Source snippet retrieval
5. General semantic context

## Freshness Layer

Each fact and page should have freshness metadata.

Freshness states:

- `current`
- `possibly_stale`
- `deprecated`
- `historical`
- `disputed`

`needs_review` is a review status for candidate records, not a production fact freshness state.

Pricing, sales status, and support status should be treated as high-change data and reviewed regularly.

## Data Model Sketch

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

## Collection Strategy

Data collection should happen in three stages.

### 1. Official Sources First

Start with Apple official sources:

- Technical specification pages
- Newsroom announcement posts
- Support compatibility articles
- Developer documentation

### 2. Structured Extraction

Use a combination of parsers and LLM-assisted extraction to extract:

- Product name
- Model identifiers
- Announcement date
- Release date
- Chip
- Display
- Camera
- Ports
- Dimensions and weight
- OS support
- Pricing and sales status

LLM-extracted candidate facts must not be promoted into production facts without source spans or citation evidence.

### 3. Review and Versioning

Each update should produce a diff:

- Added facts
- Changed facts
- Deprecated facts
- Source changes
- Confidence changes

## LLM Answering Rules

The knowledge base should enforce these answer rules:

- Product specification answers must cite source-backed facts.
- Questions involving "latest", "current", "still supported", or "worth buying" must check freshness.
- Non-official sources must be labeled clearly.
- Source conflicts must be surfaced instead of silently merged.
- Unsupported claims must not be stated with certainty.
- Comparison answers should prefer structured facts over raw semantic snippets.

## Consequences

Benefits:

- Reduces LLM hallucination.
- Supports precise product comparisons.
- Supports historical timeline queries.
- Preserves source traceability.
- Can expand into buying guides, compatibility queries, and recommendation workflows.

Costs:

- Higher initial modeling cost.
- Fact extraction requires review.
- Source update monitoring needs maintenance.
- Locale-specific Apple pages require explicit locale handling.

## Alternatives Considered

### Pure Markdown Wiki

Rejected because it is good for human reading but weak for precise querying, comparison, version tracking, and source-level citation.

### Pure Vector Database

Rejected because semantic retrieval alone is unreliable for specifications, dates, compatibility, and numerical comparisons.

### Raw Webpage Archive Only

Rejected because it lacks entity and fact structure. The LLM would need to reinterpret raw content on every query, increasing cost and reducing reliability.

## Follow-up ADRs

- ADR-002: Apple Product Entity Schema
- ADR-003: Fact Model and Citation Format
- ADR-004: Source Trust Levels
- ADR-005: Hybrid Retrieval Strategy
- ADR-006: Freshness Policy
- ADR-007: LLM Answer Citation Rules
