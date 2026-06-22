import { describe, expect, it } from 'vitest';
import { parseWikiPage } from '../../packages/content/src/index.js';

const validPage = `---
type: product
title: iPhone 17 Pro
slug: iphone-17-pro
lang: zh-TW
siblings:
  en: products/iphone-17-pro.en.md
status: draft
os_version: null
last_updated: 2026-06-22
source_count: 1
source_refs:
  - raw/samples/iphone-17-pro-source.md
tags:
  - iphone
ingest_managed_sections:
  - overview
  - specs
human_owned_sections:
  - selling_points
---

# iPhone 17 Pro
`;

describe('wiki frontmatter schema', () => {
  it('parses valid wiki frontmatter', () => {
    const page = parseWikiPage(validPage);

    expect(page.frontmatter).toMatchObject({
      type: 'product',
      title: 'iPhone 17 Pro',
      slug: 'iphone-17-pro',
      lang: 'zh-TW',
      source_refs: ['raw/samples/iphone-17-pro-source.md'],
      human_owned_sections: ['selling_points'],
    });
    expect(page.content).toContain('# iPhone 17 Pro');
  });

  it('rejects missing required fields', () => {
    const invalidPage = `---
type: product
slug: iphone-17-pro
lang: zh-TW
status: draft
last_updated: 2026-06-22
source_count: 0
ingest_managed_sections: []
human_owned_sections: []
---

# Missing title
`;

    expect(() => parseWikiPage(invalidPage)).toThrow();
  });

  it('requires os_version for beta pages', () => {
    const betaPage = validPage.replace('status: draft', 'status: beta');

    expect(() => parseWikiPage(betaPage)).toThrow(/os_version/);
  });

  it('requires source_count to match source_refs length', () => {
    const mismatchedPage = validPage.replace('source_count: 1', 'source_count: 2');

    expect(() => parseWikiPage(mismatchedPage)).toThrow(/source_count/);
  });
});
