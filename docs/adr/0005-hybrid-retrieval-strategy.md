# ADR-005: Hybrid Retrieval Strategy

## Status

Accepted

## Date

2026-06-10

## Context

Apple product questions are not all the same. Some require exact lookup, such as model numbers or release dates. Some require semantic search, such as "which iPad is good for drawing". Some require graph traversal, such as accessory compatibility. Some require freshness checks, such as current sales status.

A pure vector search system would be convenient but unreliable for precise specifications, dates, numbers, and compatibility. A pure structured database would be precise but weak for exploratory questions.

## Decision

Use hybrid retrieval with a deterministic retrieval plan.

Retrieval should combine:

- Entity matching
- Structured fact lookup
- Graph traversal
- Keyword search
- Vector search
- Source evidence retrieval
- Freshness and trust ranking

## Retrieval Pipeline

Use this order by default:

1. Parse user intent and detect time sensitivity.
2. Match entities and aliases.
3. Retrieve structured facts for matched entities.
4. Traverse graph relationships when comparison or compatibility is needed.
5. Run keyword search for exact terms, model numbers, and quoted phrases.
6. Run vector search for semantic context and explanatory pages.
7. Retrieve evidence snippets for facts that may be cited.
8. Rank results by trust, freshness, specificity, and locale.
9. Build a compact answer context for the LLM.

## Query Types

### Exact Specification Query

Example: "What chip does iPhone 15 Pro use?"

Preferred retrieval:

1. Entity match: `product:iphone-15-pro`
2. Fact lookup: `uses_chip`
3. Evidence retrieval

### Comparison Query

Example: "Compare iPhone 15 Pro and iPhone 16 Pro."

Preferred retrieval:

1. Entity match for both products
2. Shared predicate fact lookup
3. Difference extraction
4. Evidence retrieval for major claims

### Compatibility Query

Example: "Does Apple Pencil Pro work with iPad Pro M4?"

Preferred retrieval:

1. Entity match for accessory and product
2. Compatibility facts
3. Graph traversal to generation or variant
4. Required OS or hardware qualifiers

### Freshness-Sensitive Query

Example: "Is this still sold?"

Preferred retrieval:

1. Entity match
2. Current availability facts
3. Freshness check
4. Recent source verification

### Exploratory Query

Example: "Which Mac should I buy for video editing?"

Preferred retrieval:

1. Entity and product line match
2. Semantic page retrieval
3. Structured fact retrieval for candidate products
4. Freshness check for buying advice

## Ranking Signals

Result ranking should consider:

- Entity match confidence
- Source trust level
- Freshness status
- Locale match
- Predicate relevance
- Evidence specificity
- Recency of verification
- Whether the fact is disputed
- Whether the fact is derived or directly sourced

Official and fresh evidence should outrank weaker or stale evidence, but lower-ranked evidence should remain available for conflict explanations.

## Indexes

The system should maintain separate indexes:

- Entity index for IDs, aliases, model numbers, and names
- Fact index for structured predicates and values
- Graph index for relationships
- Keyword index for exact source and page search
- Vector index for semantic page and snippet search
- Evidence index for citation retrieval

## Answer Context

The LLM should receive compact, ranked context:

```yaml
query_intent: exact_specification
matched_entities:
  - product:iphone-15-pro
facts:
  - id: fact:iphone-15-pro:uses-chip
    value: A17 Pro
    confidence: high
    freshness: historical
    source_refs:
      - source:apple-tech-specs-iphone-15-pro
evidence:
  - id: evidence:apple-tech-specs-iphone-15-pro:chip
    quote: A17 Pro chip
```

The context should include enough evidence to answer, but not every retrieved document.

## Consequences

Benefits:

- Exact questions get precise answers.
- Semantic questions still work.
- Compatibility and comparison can use structured data.
- LLM context is smaller and more reliable.
- Freshness and trust become part of retrieval, not only answer generation.

Costs:

- Multiple indexes must be maintained.
- Query planning is more complex than vector search alone.
- Entity resolution quality becomes important.

## Alternatives Considered

### Vector Search Only

Rejected because it is unreliable for specifications, numbers, dates, and compatibility.

### SQL / Structured Search Only

Rejected because it is weak for exploratory and natural-language questions.

## Follow-up Work

- Entity resolution scoring is defined by ADR-018 and constrained by ADR-021.
- Define retrieval ranking weights beyond entity resolution scoring.
- Define retrieval evaluation sets.
- Define context packing limits for LLM answers.
