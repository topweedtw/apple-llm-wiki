import { describe, expect, it } from 'vitest';
import { buildId, isValidId, parseId } from '../src/domain/ids.js';

describe('canonical IDs', () => {
  it('builds and parses a fact ID with a qualifier', () => {
    const id = buildId('fact', 'iphone-15-pro', 'us');
    expect(id).toBe('fact:iphone-15-pro:us');
    expect(parseId(id)).toEqual({
      type: 'fact',
      slug: 'iphone-15-pro',
      qualifiers: ['us'],
    });
  });

  it('accepts known entity and record IDs', () => {
    expect(isValidId('product:iphone-15-pro')).toBe(true);
    expect(isValidId('chip:a17-pro')).toBe(true);
    expect(isValidId('evidence:apple-tech-specs-iphone-15-pro:chip')).toBe(true);
    expect(isValidId('support-policy:vintage-products')).toBe(true);
    expect(isValidId('compatibility-rule:apple-pencil-pro-ipad-pro-m4')).toBe(true);
    expect(isValidId('review-decision:2026-06-11:000123')).toBe(true);
    expect(isValidId('index-event:2026-06-10:000001')).toBe(true);
    expect(isValidId('page:product:iphone-15-pro')).toBe(true);
  });

  it('rejects unknown types and malformed slugs', () => {
    expect(isValidId('widget:foo')).toBe(false);
    expect(isValidId('product:')).toBe(false);
    expect(isValidId('product:Iphone_15')).toBe(false);
    expect(() => buildId('fact', 'Bad Slug')).toThrow();
  });
});
