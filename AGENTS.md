# AGENTS.md — Apple Training Wiki Schema

**Version**: 1.0
**Last updated**: 2026-06-12
**Language**: English (primary); key terminology is bilingual (zh-TW / en).

This file is the Layer 3 schema for the Apple Training Wiki. It is authored by
humans and read by LLM agents. It defines how agents ingest sources and write
wiki pages. Architecture and stack are defined in
[ADR-023](docs/adr/0023-architecture-re-anchoring-markdown-llm-wiki.md) and
[ADR-024](docs/adr/0024-technology-stack-re-selection-cloudflare-first.md);
product scope is in `docs/apple-llm-wiki-PRD-v0.3.md`.

---

## 0. Purpose & Roles

The wiki is an LLM-maintained Apple product knowledge base used to extract
teaching materials (question banks, video scripts, sales scripts) for trainers.

Three layers, three roles:

| Layer | Path | Who writes | Who reads |
| --- | --- | --- | --- |
| Raw | `raw/` | ingest agent (fetch only) | agents (read only) |
| Wiki | `wiki/` | LLM agents | humans + agents |
| Schema | `AGENTS.md` | humans | agents |

Hard rules for every agent:

- The only way knowledge enters the wiki is a **GitHub pull request** reviewed
  and merged by a human maintainer. Agents never commit to the default branch.
- Agents **read** `raw/`, they never edit it.
- When in doubt, do not guess. Mark `> 🟡 NEEDS REVIEW` and stop.

---

## 1. Repo Structure & Layers

Single **private** repository for now. The public/private split in the PRD is
deferred (ADR-023); agents must still rewrite source content rather than copy it,
so a future public split stays clean.

```text
raw/                     original crawled pages + uploaded materials (read-only)
  apple-com/  apple-support/  apple-newsroom/  developer-apple/  manual-uploads/
wiki/                    LLM-authored canonical knowledge
  index.md               page directory
  log.md                 append-only change log
  products/              e.g. iphone-17-pro.zh-TW.md, iphone-17-pro.en.md
  os/  concepts/  comparisons/  sales-playbook/  demos/  weekly-digest/
  DISCLAIMER.md          single source of disclaimer text
AGENTS.md                this schema
sources-config.yaml      crawl sources + tier
```

Each concept is **two files**, one per language, distinguished by a `lang`
suffix (`*.zh-TW.md`, `*.en.md`). Both must reference each other in `siblings`.

---

## 2. Ingest Workflow

```text
source (raw/) -> relevance gate -> tier check -> rewrite (二創) -> bilingual handling -> open PR
```

1. Read raw content (`raw/`) plus any existing wiki page for the same concept.
2. **Relevance gate**: T1 passes automatically. T2 and below are scored 0–10
   across four dimensions (direct Apple mention, ecosystem adjacency, teaching
   potential, recency). `< 5` skip; `5–6` mark for human decision; `>= 7` ingest.
3. **Tier check**: enforce Section 4. T4 is rejected and never written.
4. **Rewrite (二創)**: never copy T1 prose; restate facts in original wording.
5. **Bilingual**: zh-TW primary, en secondary. If a source is English and no
   zh-TW page exists, create the English page first and queue translation.
6. Update `index.md` and append to `log.md`.
7. Open a pull request. Never write directly to the default branch.

Maps to ADR-008 (re-scoped) and ADR-010 (fetch strategy).

---

## 3. Page-wide Rules

### 3.1 Frontmatter schema

```yaml
type: product            # product | os | concept | comparison | sales-play | digest
slug: iphone-17-pro
lang: zh-TW              # zh-TW | en
siblings:
  en: products/iphone-17-pro.en.md
status: current          # see Section 6 (ADR-006 values + beta)
os_version: null         # required when status: beta, e.g. "27.0-beta3"
last_updated: 2026-06-12
source_count: 7
tags: [iphone, current, pro-line]
ingest_managed_sections: [overview, specs, price, sources]
human_owned_sections: [selling_points, signature_demos, qa, objection_handling]
```

Validated by a Zod schema in CI. Missing required fields fail the PR.

### 3.2 Content rules

- **Never copy T1 source prose into the wiki.** Restate as original
  ("二創") narrative. This holds even while the repo is private (ADR-023).
- Agents must not edit any section listed in `human_owned_sections`.
- Every factual claim must be traceable to a source (Section 7).

### 3.3 Official terminology (zh-TW / en)

| 正確 (zh-TW) | Correct (en) | 錯誤 / Wrong |
| --- | --- | --- |
| Mac | Mac | MAC |
| iPhone | iPhone | Iphone, IPhone |
| iPad | iPad | Ipad |
| Apple Watch | Apple Watch | iWatch |
| App Store | App Store | Appstore |

Extend this table as new product names appear. Capitalization matters.

### 3.4 Price / version / date formats

- Date: `YYYY-MM-DD` in frontmatter and footnotes.
- Price: list official price only, with currency and locale (e.g. `NT$36,900`,
  `US$999`). Never write discounts or promotional prices (Section 5).
- OS version: `27.0`, beta builds as `27.0-beta3`.

### 3.5 Annotation markers

- `> ⚠️ CONFLICT (flagged YYYY-MM-DD)` — new vs old facts disagree; keep both.
- `> ⚠️ LANG-SYNC` — zh-TW and en fact layers disagree; stop writing the page.
- `> 🟡 NEEDS REVIEW` — uncertain; route to a human.

---

## 4. Source Trust & Tiers

Tiers map onto ADR-004 trust levels.

| Tier | Examples | ADR-004 mapping | May write to |
| --- | --- | --- | --- |
| T1 | apple.com, support.apple.com, newsroom, developer.apple.com, approved internal materials | official_primary / official_secondary | all sections (specs, price, core facts) |
| T2 | reseller official training materials | trusted_secondary | analysis / selling sections, with T1 footnote |
| T2-filtered | known Apple media review/how-to (no rumors/) | trusted_secondary | same as T2, post-launch reviews only |
| T3 | general tech media | community | weekly-digest "market sentiment" only |
| T4 | leaks, rumors, analyst predictions | (excluded) | ❌ never; blocked at the crawl layer |

Footnotes are evidence, not decoration: a footnote must point to the specific
source that supports the claim (Section 7).

---

## 5. Red Lines

The agent must never:

1. Write about unannounced products (even leaked T1 content).
2. Write specific discounts or promotional prices (list price only).
3. Disparage competitors (objective spec comparison is fine; no attacks).
4. Promise unannounced availability dates.
5. Cite T4 sources.
6. Copy T1 source prose into the public-facing wiki; rewrite as 二創.

When uncertain about any of the above: `> 🟡 NEEDS REVIEW` and stop.

---

## 6. Freshness & Lifecycle

`status` uses the ADR-006 freshness values plus `beta`:

| status | Meaning |
| --- | --- |
| `current` | recently verified; reflects the current state |
| `beta` | pre-release content; **requires** `os_version`; render with 🧪 and append the Beta disclaimer; demote on general availability |
| `possibly_stale` | TTL expired or last verification is old; needs recheck |
| `historical` | past event or stable historical property |
| `deprecated` | superseded; keep for history only, not for new answers |
| `disputed` | sources conflict for the same scope and time range |

Review triggers (ADR-006): TTL expiry, source checksum change, a new Apple
announcement, a major OS release, or the monthly lint (Section 10). TTL expiry
moves `current` to `possibly_stale`; it never deletes content.

Beta handling: on the general-availability date, open a PR that demotes
`status: beta` pages and prompts a maintainer to diff "Beta vs final".

---

## 7. Claim-Level Traceability

This is the core anti-hallucination guardrail (ADR-003, ADR-012).

- Every factual claim must carry a footnote pointing to the **specific** source
  that supports it.
- A single citation for a whole paragraph is **not** sufficient when the
  paragraph contains multiple factual claims.
- Footnote format:

  ```text
  [^1]: https://www.apple.com/tw/iphone-17-pro/ (T1, fetched 2026-06-12)
  ```

- Narrative framing, hooks, and calls to action that assert no fact may omit
  citations.
- If a claim cannot be traced to a source: remove it, rewrite it as an explicit
  assumption, or mark `> 🟡 NEEDS REVIEW`.
- The extraction generators (question bank, video, sales) inherit this rule:
  generated factual claims keep claim-level references back to wiki sources.

---

## 8. Page Templates (skeleton — detailed in Phase 3)

Page types: Product, OS, Concept, Comparison, SalesPlay. Each declares
`ingest_managed_sections` (LLM may write) and `human_owned_sections` (LLM must
not touch).

Product page section skeleton:

```text
# <Product Name>
## Overview          [ingest-managed]
## Specs             [ingest-managed]
## Price             [ingest-managed]
## Selling Points    [human-owned]   (FAB+P structure — detailed in Phase 3)
## Signature Demos   [human-owned]
## Q&A / Objections  [human-owned]
## Sources           [ingest-managed] (footnotes per Section 7)
```

The FAB+P sales structure, three-length demo scripts, and the other generator
templates are specified in Phase 3 (PRD §5.3). v1.0 only fixes the section
ownership boundary so the ingest agent never overwrites human work.

---

## 9. Conflict / Review / PR States

All writes flow through pull requests; humans review and merge. The PR carries
the review state (mapping the spirit of the ADR-014 state machine):

- **needs_review** — the page contains a `> 🟡 NEEDS REVIEW` marker; a human must
  decide before merge.
- **conflict** — new and old facts disagree; the agent keeps both versions under
  a `> ⚠️ CONFLICT` marker and does not silently overwrite.
- **lang-sync** — the zh-TW and en fact layers disagree; the agent marks
  `> ⚠️ LANG-SYNC` and stops writing the page until a human resolves it.

The agent must never merge its own PR, promote unverified claims, or resolve a
conflict by deletion.

---

## 10. Lint Checklist

Run monthly and in CI (PRD §8.3). Flags:

- stale pages (`last_updated` > 60 days)
- missing required sections
- bilingual asymmetry (one language present, the sibling missing)
- unresolved `CONFLICT` older than 14 days
- unresolved `NEEDS REVIEW` older than 30 days
- orphan pages (not linked from `index.md`)
- red-line keyword scan (e.g. "unannounced", "rumor", "leak", discount terms)
- disclaimer presence in any export template
- frontmatter schema validity (Section 3.1)

---

## 11. Disclaimer Mechanism

`wiki/DISCLAIMER.md` is the single source of disclaimer text. Generators and
export templates read the latest version and embed it; they must not hardcode
their own copy. Updating disclaimer text goes through a PR. Beta content appends
the Beta-specific disclaimer line.

---

## 12. Raw Data Layer Specification

Raw content lives under `raw/<source>/<YYYY-Www>/<slug>.html` with a sibling
`<slug>.meta.json`:

```json
{
  "source_url": "https://www.apple.com/tw/iphone-17-pro/",
  "content_hash": "sha256:...",
  "fetched_at": "2026-06-12T03:00:00Z",
  "tier": "T1",
  "locale": "zh-TW",
  "fetcher": "http",
  "copyright_status": null
}
```

For `manual-uploads/`, `copyright_status` is required and records the uploader's
declared basis (internal-use confirmed, Apple public material, reseller-licensed,
or self-authored). The wiki references raw content by `source_url` +
`content_hash`; it never copies the raw original into a wiki page.

---

## 13. Version History

- **v1.0** (2026-06-12): Initial schema. Sections 0–7, 9–13 complete; Section 8
  page templates are skeletons pending Phase 3. Aligned with ADR-023 (Markdown
  LLM-Wiki re-anchoring) and ADR-024 (Cloudflare-first stack).
