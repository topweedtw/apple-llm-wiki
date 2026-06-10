# Architecture Flow

This document summarizes the Apple LLM Wiki system architecture described by
the ADR set.

```text
+----------------------+
| Source Discovery     |
| Apple / archive /    |
| secondary / retailer |
+----------+-----------+
           |
           v
+----------------------+
| Candidate Source     |
| Queue                |
+----------+-----------+
           |
           v
+----------------------+
| Fetch + Snapshot     |
| HTTP first, browser  |
| fallback, checksum   |
+----------+-----------+
           |
           v
+----------------------+
| Source Registry      |
| trust_level, scope,  |
| locale, review state |
+----------+-----------+
           |
           v
+----------------------+
| Extraction Layer     |
| parser first, LLM    |
| assisted if needed   |
+----------+-----------+
           |
           v
+----------------------+
| Staging              |
| candidate_entities   |
| candidate_facts      |
| evidence anchors     |
+----------+-----------+
           |
           v
+----------------------+
| Validation + Review  |
| schema, evidence,    |
| entity resolution,   |
| conflicts, freshness |
+----------+-----------+
           |
           v
+----------------------+
| System of Record     |
| Postgres             |
| sources              |
| entities             |
| facts                |
| evidence             |
| pages                |
| reviews/jobs         |
+----+------+-----+----+
     |      |     |
     |      |     v
     |      |  +------------------+
     |      |  | Freshness Jobs   |
     |      |  | TTL/checksum/    |
     |      |  | re-ingestion     |
     |      |  +------------------+
     |      |
     |      v
     |  +------------------+
     |  | Wiki Pages       |
     |  | human-readable   |
     |  | curated context  |
     |  +------------------+
     |
     v
+----------------------+
| Retrieval Indexes    |
| entity, fact, graph, |
| keyword, vector,     |
| evidence             |
+----------+-----------+
           |
           v
+----------------------+
| Retrieval Planner    |
| intent, entity match,|
| fact lookup, graph,  |
| ranking, context     |
+----------+-----------+
           |
           v
+----------------------+
| LLM Answer Layer     |
| cited answers,       |
| freshness warnings,  |
| conflict handling    |
+----------+-----------+
           |
           v
+----------------------+
| Content Generation   |
| question banks,      |
| video/retail/FABE    |
| scripts with claims  |
+----------------------+
```
