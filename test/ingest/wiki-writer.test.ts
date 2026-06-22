import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendWikiLogEntry,
  recordWikiWrite,
  upsertWikiIndexEntry,
  writeWikiPage,
} from '../../ingest/src/index.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-'));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

describe('wiki writer utilities', () => {
  it('adds a wiki index entry once', async () => {
    const entry = {
      title: 'iPhone 17 Pro',
      path: 'products/iphone-17-pro.zh-TW.md',
    };

    await upsertWikiIndexEntry(repoRoot, entry);
    await upsertWikiIndexEntry(repoRoot, entry);

    const index = await readFile(join(repoRoot, 'wiki/index.md'), 'utf8');

    expect(index.match(/iPhone 17 Pro/g)).toHaveLength(1);
    expect(index).toContain('- [iPhone 17 Pro](products/iphone-17-pro.zh-TW.md)');
  });

  it('appends wiki log entries without replacing existing content', async () => {
    const logPath = join(repoRoot, 'wiki/log.md');
    await upsertWikiIndexEntry(repoRoot, {
      title: 'Existing',
      path: 'products/existing.md',
    });
    await writeFile(logPath, '# Wiki Change Log\n\n- existing entry\n', 'utf8');

    await appendWikiLogEntry(repoRoot, {
      action: 'update',
      page: 'products/iphone-17-pro.zh-TW.md',
      sourceRefs: ['raw/samples/iphone-17-pro-source.md'],
      timestamp: '2026-06-22T00:00:00.000Z',
    });

    const log = await readFile(logPath, 'utf8');

    expect(log).toContain('- existing entry');
    expect(log).toContain(
      '- 2026-06-22T00:00:00.000Z update products/iphone-17-pro.zh-TW.md sources: raw/samples/iphone-17-pro-source.md',
    );
  });

  it('rejects log writes without source refs', async () => {
    await expect(
      recordWikiWrite(
        repoRoot,
        {
          title: 'iPhone 17 Pro',
          path: 'products/iphone-17-pro.zh-TW.md',
        },
        {
          action: 'create',
          page: 'products/iphone-17-pro.zh-TW.md',
          sourceRefs: [],
          timestamp: '2026-06-22T00:00:00.000Z',
        },
      ),
    ).rejects.toThrow(/source_refs/);
  });

  it('records a wiki write in the index and log', async () => {
    await recordWikiWrite(
      repoRoot,
      {
        title: 'iPhone 17 Pro',
        path: 'products/iphone-17-pro.zh-TW.md',
      },
      {
        action: 'create',
        page: 'products/iphone-17-pro.zh-TW.md',
        sourceRefs: ['raw/samples/iphone-17-pro-source.md'],
        timestamp: '2026-06-22T00:00:00.000Z',
      },
    );

    const index = await readFile(join(repoRoot, 'wiki/index.md'), 'utf8');
    const log = await readFile(join(repoRoot, 'wiki/log.md'), 'utf8');

    expect(index).toContain('iPhone 17 Pro');
    expect(log).toContain(
      'create products/iphone-17-pro.zh-TW.md sources: raw/samples/iphone-17-pro-source.md',
    );
  });

  it('validates frontmatter before writing a wiki page', async () => {
    await writeWikiPage(repoRoot, {
      action: 'create',
      path: 'products/iphone-17-pro.zh-TW.md',
      timestamp: '2026-06-22T00:00:00.000Z',
      markdown: `---
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
tags: [iphone]
ingest_managed_sections: [overview, sources]
human_owned_sections: [selling_points]
---

# iPhone 17 Pro
`,
    });

    const page = await readFile(join(repoRoot, 'wiki/products/iphone-17-pro.zh-TW.md'), 'utf8');
    const index = await readFile(join(repoRoot, 'wiki/index.md'), 'utf8');
    const log = await readFile(join(repoRoot, 'wiki/log.md'), 'utf8');

    expect(page).toContain('# iPhone 17 Pro');
    expect(index).toContain('- [iPhone 17 Pro](products/iphone-17-pro.zh-TW.md)');
    expect(log).toContain('raw/samples/iphone-17-pro-source.md');
  });

  it('rejects wiki pages without source refs', async () => {
    await expect(
      writeWikiPage(repoRoot, {
        action: 'create',
        path: 'products/iphone-17-pro.zh-TW.md',
        timestamp: '2026-06-22T00:00:00.000Z',
        markdown: `---
type: product
title: iPhone 17 Pro
slug: iphone-17-pro
lang: zh-TW
status: draft
os_version: null
last_updated: 2026-06-22
source_count: 0
source_refs: []
tags: [iphone]
ingest_managed_sections: [overview, sources]
human_owned_sections: [selling_points]
---

# iPhone 17 Pro
`,
      }),
    ).rejects.toThrow(/source_refs/);
  });
});
