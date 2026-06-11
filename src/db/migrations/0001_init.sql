-- 0001_init: enable extensions required by later canonical-schema phases.
-- citext  -> case-insensitive alias and name matching (entity resolution)
-- pg_trgm -> trigram keyword search projection (ADR-015 derived views)
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
