/**
 * Canonical ID conventions (ADR-003).
 *
 * Format: `<type>:<slug>[:<qualifier>]...`
 * - type and qualifiers are lowercase, hyphen-separated tokens
 * - IDs must be stable and must not embed mutable values
 */

export const ID_TYPES = [
  // entity types (ADR-002)
  'product-line',
  'product-generation',
  'product',
  'variant',
  'chip',
  'os',
  'feature',
  'event',
  'accessory',
  'support-policy',
  'compatibility-rule',
  // knowledge records (ADR-003)
  'source',
  'evidence',
  'fact',
  'candidate-fact',
  // ingestion and review records (ADR-014, ADR-019)
  'candidate-source',
  'candidate-issue',
  'review-decision',
  // derived views (ADR-001, ADR-015)
  'page',
  'index-event',
] as const;

export type IdType = (typeof ID_TYPES)[number];

const TOKEN = '[a-z0-9]+(?:-[a-z0-9]+)*';
const ID_PATTERN = new RegExp(`^(${ID_TYPES.join('|')}):${TOKEN}(?::${TOKEN})*$`);

export interface ParsedId {
  type: IdType;
  slug: string;
  qualifiers: string[];
}

export function buildId(type: IdType, slug: string, ...qualifiers: string[]): string {
  const parts = [type, slug, ...qualifiers];
  const id = parts.join(':');
  if (!isValidId(id)) {
    throw new Error(`Invalid ID constructed: ${id}`);
  }
  return id;
}

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function parseId(id: string): ParsedId {
  if (!isValidId(id)) {
    throw new Error(`Invalid ID: ${id}`);
  }
  const [type, slug, ...qualifiers] = id.split(':');
  return { type: type as IdType, slug: slug as string, qualifiers };
}
