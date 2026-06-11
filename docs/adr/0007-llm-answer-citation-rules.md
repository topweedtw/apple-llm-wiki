# ADR-007: LLM Answer Citation Rules

## Status

Accepted

## Date

2026-06-10

## Context

The Apple LLM Wiki exists so LLMs can answer with grounded, verifiable information. Even with good entities, facts, sources, retrieval, and freshness metadata, the answer layer still needs rules. Without answer rules, the model may overstate confidence, omit citations, ignore stale facts, or merge conflicting evidence.

## Decision

LLM answers must be generated from retrieved facts and evidence-backed citations.

The answer layer must preserve uncertainty, source quality, freshness, and locale boundaries.

## Core Rules

1. Cite factual claims that come from the knowledge base.
2. Use evidence-backed citations, not only source URLs.
3. Prefer official and reviewed sources.
4. Check freshness for current, latest, still supported, available, pricing, and buying-advice questions.
5. Do not treat locale-specific facts as global.
6. Do not silently merge conflicting facts.
7. Do not use candidate records in final answers. When only `possibly_stale` production facts are available, answer cautiously with freshness context.
8. Distinguish source-backed facts from recommendations or reasoning.

## Citation Requirements

Citations are required for:

- Product specifications
- Release and announcement dates
- Compatibility claims
- OS support claims
- Pricing, sales status, and availability
- Repair, vintage, or obsolete status
- Comparisons based on factual differences
- Claims from secondary sources

Citations are optional for:

- High-level summaries composed entirely from already cited facts
- Obvious navigation statements
- User-provided information repeated back to the user

## Citation Rendering

Internal references should use fact and evidence IDs. Human-facing answers should render readable source names.

Example answer:

```text
iPhone 15 Pro uses the A17 Pro chip, according to Apple's technical specifications.
```

Attached citation metadata should point to:

```yaml
fact_id: fact:iphone-15-pro:uses-chip
source_id: source:apple-tech-specs-iphone-15-pro
evidence_id: evidence:apple-tech-specs-iphone-15-pro:chip
```

## Freshness-Sensitive Answers

For questions involving "latest", "current", "now", "still sold", "supported", "worth buying", or similar wording:

- Use `current` facts when available.
- If only `possibly_stale` facts exist, state the last verification date.
- If freshness is unknown, say that verification is needed.
- Do not make buying recommendations from stale pricing or availability data.

## Conflict Answers

When facts are `disputed`:

- State that sources disagree.
- Explain the competing claims.
- Prefer official sources when appropriate.
- Avoid choosing a winner unless source policy clearly supports it.

## Comparison Answers

Comparison answers should:

- Use shared predicates where possible.
- Separate factual differences from recommendations.
- Cite key differences.
- Avoid comparing unavailable fields as if they were known.

## Recommendation Answers

Recommendations should be labeled as reasoning, not as source facts.

A recommendation may use facts as inputs, but the final advice should explain assumptions such as budget, workload, region, freshness, and tradeoffs.

## Insufficient Evidence

If the retrieved context lacks enough evidence:

- Say what is missing.
- Avoid inventing facts.
- Suggest what source or fact type would be needed.

## Consequences

Benefits:

- Answers remain auditable.
- Users can distinguish facts from advice.
- Stale or disputed information is less likely to be presented as certain.
- The system can support high-trust product comparisons and buying guidance.

Costs:

- Answers may be more cautious.
- Retrieval must supply evidence, not just summaries.
- Citation formatting must be supported in UI and API responses.

## Alternatives Considered

### Let the LLM Decide When to Cite

Rejected because citation behavior must be predictable and testable.

### Cite Every Sentence

Rejected because it creates noisy answers. The rule should cite meaningful factual claims and key comparison points.

## Follow-up Work

- Define response schemas for cited answers.
- Add tests for stale, disputed, and insufficient-evidence answers.
- Define UI rendering for citations and freshness warnings.
