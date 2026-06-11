/**
 * Centralized enum definitions. Database check constraints / enum types must
 * stay aligned with these values; the two must never drift (ADR-017).
 */

/** Production fact freshness (ADR-006). `needs_review` is NOT a freshness value. */
export const FRESHNESS = [
  'current',
  'possibly_stale',
  'historical',
  'deprecated',
  'disputed',
] as const;
export type Freshness = (typeof FRESHNESS)[number];

/** Fact confidence (ADR-003). */
export const CONFIDENCE = ['high', 'medium', 'low', 'unknown'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

/** Fact value types (ADR-003). */
export const VALUE_TYPES = [
  'entity',
  'string',
  'number',
  'integer',
  'boolean',
  'date',
  'datetime',
  'enum',
  'list',
  'range',
  'money',
] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

/** Candidate source states (ADR-014). */
export const CANDIDATE_SOURCE_STATES = [
  'discovered',
  'pending_fetch',
  'fetched',
  'classified',
  'extraction_ready',
  'extraction_failed',
  'ready_for_review',
  'rejected',
  'published',
  'deprecated',
] as const;
export type CandidateSourceState = (typeof CANDIDATE_SOURCE_STATES)[number];

/** Candidate fact states (ADR-014). */
export const CANDIDATE_FACT_STATES = [
  'extracted',
  'intake_valid',
  'needs_review',
  'blocked',
  'approved',
  'rejected',
  'promoted',
] as const;
export type CandidateFactState = (typeof CANDIDATE_FACT_STATES)[number];

/** Candidate issue states (ADR-014). */
export const CANDIDATE_ISSUE_STATES = [
  'open_blocking',
  'open_non_blocking',
  'resolved',
  'accepted_non_blocking',
  'rejected_candidate',
] as const;
export type CandidateIssueState = (typeof CANDIDATE_ISSUE_STATES)[number];

/** Review decisions (ADR-014). */
export const REVIEW_DECISIONS = [
  'approve',
  'reject',
  'request_changes',
  'accept_non_blocking_issue',
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/** Predicate status (ADR-021). */
export const PREDICATE_STATUS = ['active', 'legacy_alias', 'deprecated'] as const;
export type PredicateStatus = (typeof PREDICATE_STATUS)[number];

/** Predicate locale policy (ADR-021). */
export const LOCALE_POLICY = ['required', 'optional', 'prohibited'] as const;
export type LocalePolicy = (typeof LOCALE_POLICY)[number];

/** Enum value set for has_support_status (ADR-021). */
export const SUPPORT_STATUS = ['supported', 'vintage', 'obsolete', 'unsupported'] as const;
export type SupportStatus = (typeof SUPPORT_STATUS)[number];

/** Enum value set for has_sales_status (ADR-021). */
export const SALES_STATUS = [
  'available',
  'preorder',
  'announced',
  'sold_out',
  'discontinued',
] as const;
export type SalesStatus = (typeof SALES_STATUS)[number];

/** Enum value set for compatible_with (ADR-021). */
export const COMPATIBILITY = ['compatible', 'incompatible', 'partial'] as const;
export type Compatibility = (typeof COMPATIBILITY)[number];
