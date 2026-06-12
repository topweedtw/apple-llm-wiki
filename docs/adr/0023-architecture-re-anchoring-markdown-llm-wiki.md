# ADR-023: Architecture Re-Anchoring to a Markdown LLM-Wiki

## Status

Accepted

## Date

2026-06-12

## Context

ADR-001 through ADR-022 designed a Postgres-backed, structured fact knowledge
base: atomic source-backed facts, an entity/predicate/value model, candidate
intake and promotion state machines, and a cited-answer API. ADR-001 explicitly
rejected a "Pure Markdown Wiki" because it is weak for precise specification
queries, numeric comparison, and source-level citation.

PRD v0.2 (`docs/apple-llm-wiki-PRD-v0.2.md`) states the real product need from
the project owner:

- an LLM-maintained Apple product knowledge base
- extraction of teaching materials (question banks, video scripts, sales
  scripts) from that knowledge
- future external access to the extraction capability for other trainers
- maintenance by a small, mostly non-engineer team who review changes through
  GitHub pull requests

These needs change the premise behind ADR-001's rejection. The product is a
teaching-material engine for trainers, not a specification-comparison query
engine. The weaknesses of a Markdown wiki (precise numeric/spec querying) are
not on this product's critical path, while its strengths (LLM read/write,
GitHub PR review by non-engineers, human-readable pages, community
contribution) are exactly what the product needs.

## Decision

Re-anchor the architecture to a **Markdown LLM-Wiki** as the primary design,
following the PRD v0.2 structure. The Postgres structured fact layer is paused,
not deleted, and its accumulated quality discipline is retained as guardrails.

### Primary architecture

- **Two content layers in a single private Git repository** (for now):
  - `raw/` — original crawled pages and uploaded materials (LLM reads only)
  - `wiki/` — LLM-authored, rewritten ("二創") canonical knowledge pages (LLM writes)
- **`AGENTS.md`** — the human-authored schema and rules the LLM must follow
- **Maintenance flow**: LLM agents ingest sources and open GitHub pull requests;
  humans review and merge through the GitHub web UI
- **Single Source of Truth (SSoT)**: the Markdown content in Git. `raw/` is the
  evidence of record; `wiki/` is the canonical rewritten knowledge. Postgres is
  no longer the SSoT.
- **Extraction layer**: question-bank, video-script, and sales-script
  generators read the wiki and produce teaching materials with claim-level
  traceability back to wiki sources.

### Repository scope

Start with a **single private repository** containing `wiki/`, `raw/`, config,
the SPA front end, the API, and ingestion code. The PRD's public/private
two-repo split is deferred until external publication is actually pursued. Even
while private, the LLM should keep rewriting source content ("二創") rather than
copying originals, to keep a future public split clean.

### Technology

Runtime and framework selection is re-decided in **ADR-024** (Cloudflare-first:
Vite + React SPA, Hono API on Workers, Vercel AI SDK, GitHub Actions for
ingestion). ADR-024 supersedes ADR-017.

## Relationship to Existing ADRs

ADRs are not rewritten in place. This ADR is the single record of each ADR's new
status. Statuses:

- **Retained** — still applies, maps onto the wiki model with little change
- **Re-scoped** — the principle survives but its mechanism changes for a
  Markdown/PR world
- **On-hold** — specific to the Postgres structured fact layer; paused until and
  unless an external extraction/indexing layer needs it
- **Superseded** — replaced by this ADR or ADR-024

| ADR | Topic | New status | Notes |
| --- | --- | --- | --- |
| 001 | Knowledge base architecture | Superseded | Replaced by this ADR; fact-citation principles retained as guardrails |
| 002 | Entity schema | On-hold | Entity concepts become wiki page organization and frontmatter, not DB tables |
| 003 | Fact model and citation | Re-scoped | Claim-level traceability becomes wiki footnotes/`claim_refs`; structured fact tables on-hold |
| 004 | Source trust levels | Retained | Maps onto PRD source tiers T1–T4 |
| 005 | Hybrid retrieval | On-hold | Revisit if an external extraction/index layer is built |
| 006 | Freshness policy | Retained | Maps onto frontmatter `status` + monthly lint |
| 007 | Answer citation rules | Re-scoped | Becomes citation rules for the extraction generators |
| 008 | Discovery and ingestion workflow | Re-scoped | LLM agent ingest + PR, not DB candidate/promotion flow |
| 009 | Historical ingestion policy | Retained | Policy still applies to wiki content |
| 010 | Crawl/extraction technology | Retained | Fetch strategy kept; Postgres storage part dropped |
| 011 | Crawl validation and QA | Re-scoped | Becomes CI lint + PR review gates |
| 012 | Knowledge-to-content generation | Retained | Core policy for the three generators; highly applicable |
| 013 | Source of truth and derived views | Re-scoped | SSoT redefined as Git Markdown |
| 014 | Ingestion promotion state machine | On-hold | Replaced by PR review states; `needs_review`/conflict spirit kept |
| 015 | Index consistency and rebuild | On-hold | No DB/index yet; revisit for external extraction |
| 016 | Fact value normalization | On-hold | No structured value layer in the wiki model |
| 017 | Runtime and framework | Superseded | Replaced by ADR-024 |
| 018 | Entity resolution | On-hold | Postgres-fact-layer mechanism |
| 019 | Review interface and operations | Re-scoped | CLI review → GitHub PR web review |
| 020 | Unit registry | On-hold | Postgres-fact-layer mechanism |
| 021 | Predicate role registry | On-hold | Postgres-fact-layer mechanism |
| 022 | Entity seeding | On-hold | Postgres-fact-layer mechanism |

## Quality Guardrails Carried Over

The following ADR disciplines are explicitly carried into the wiki model so the
re-anchoring does not lose hard-won rigor:

- **Source trust (ADR-004)** strengthens the PRD T1–T4 tier rules.
- **Freshness (ADR-006)** backs the frontmatter `status` and monthly lint.
- **Claim-level traceability (ADR-003, ADR-012)** means wiki footnotes are
  verifiable references, not bare URLs; generators must trace each factual claim.
- **Ingestion review spirit (ADR-014)** maps onto PR states: `needs_review`,
  `conflict`, `lang-sync`.
- **Content generation policy (ADR-012)** applies almost directly to the three
  generators (FAB+P, `claim_refs`, review levels).

## Phase 0 Skeleton Disposition

The committed Phase 0 skeleton (Postgres, Fastify, Kysely, Commander CLI,
docker-compose) has been **removed from `main`** and preserved at tag
`v1-postgres-architecture` and branch `archive/postgres-fact-layer`. It may be
revived from there as an indexing/query backend if a future external extraction
API needs precise retrieval. ADR-024 defines what is reused (TypeScript, pnpm,
Vitest, Biome, Zod) and what is shelved.

## Consequences

Benefits:

- Architecture now matches the real product: LLM-maintained, PR-reviewed by
  non-engineers, teaching-material extraction.
- Prior ADR rigor is preserved as guardrails rather than discarded.
- A single private repo keeps the first build simple; public/private split is
  deferred but not blocked.

Costs:

- Much of the structured fact-layer design is paused.
- The Phase 0 Postgres skeleton is not used in the near term.
- Precise structured querying is deferred to a future extraction/index layer.

## Follow-up Work

- Record the re-decided technology stack in ADR-024.
- Add status markers to ADR-001 and ADR-017 pointing here and to ADR-024.
- Author `AGENTS.md` v1.0 as the wiki schema (PRD appendix B).
- Plan the wiki Phase 1 (PRD §9) once ADR-023 and ADR-024 are accepted.
