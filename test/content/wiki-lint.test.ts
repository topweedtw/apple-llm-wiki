import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lintWiki } from '../../packages/content/src/index.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-lint-'));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

async function writeFixture(path: string, content: string) {
  const fullPath = join(repoRoot, path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

const disclaimer = `# Disclaimer

## zh-TW

非官方內容。

## en

This wiki is not affiliated with Apple Inc.
`;

function page(input: {
  lang: 'zh-TW' | 'en';
  siblingLang: 'zh-TW' | 'en';
  siblingPath: string;
  sourceRef?: string;
}) {
  const sourceRef = input.sourceRef ?? 'raw/samples/source.md';

  return `---
type: product
title: iPhone 17 Pro
slug: iphone-17-pro
lang: ${input.lang}
siblings:
  ${input.siblingLang}: ${input.siblingPath}
status: draft
os_version: null
last_updated: 2026-06-22
source_count: 1
source_refs:
  - ${sourceRef}
tags:
  - iphone
ingest_managed_sections:
  - overview
human_owned_sections:
  - selling_points
---

# iPhone 17 Pro

## Overview

Valid content.
`;
}

async function writeValidWiki() {
  await writeFixture('wiki/DISCLAIMER.md', disclaimer);
  await writeFixture('raw/samples/source.md', 'Source');
  await writeFixture(
    'wiki/products/iphone-17-pro.zh-TW.md',
    page({
      lang: 'zh-TW',
      siblingLang: 'en',
      siblingPath: 'products/iphone-17-pro.en.md',
    }),
  );
  await writeFixture(
    'wiki/products/iphone-17-pro.en.md',
    page({
      lang: 'en',
      siblingLang: 'zh-TW',
      siblingPath: 'products/iphone-17-pro.zh-TW.md',
    }),
  );
}

describe('wiki lint', () => {
  it('passes a valid bilingual wiki set', async () => {
    await writeValidWiki();

    await expect(lintWiki(repoRoot)).resolves.toEqual({
      issues: [],
    });
  });

  it('reports red-line terms', async () => {
    await writeValidWiki();
    await writeFixture('wiki/products/rumor.md', 'This page contains rumors.');

    const result = await lintWiki(repoRoot);

    expect(result.issues).toContainEqual({
      file: 'wiki/products/rumor.md',
      message: 'red-line term found: rumor, rumors',
    });
  });

  it('reports asymmetric siblings', async () => {
    await writeValidWiki();
    await writeFixture(
      'wiki/products/iphone-17-pro.en.md',
      page({
        lang: 'en',
        siblingLang: 'zh-TW',
        siblingPath: 'products/wrong.zh-TW.md',
      }),
    );

    const result = await lintWiki(repoRoot);

    expect(result.issues.some((issue) => issue.message.includes('sibling must point back'))).toBe(
      true,
    );
  });

  it('requires disclaimer text', async () => {
    await writeValidWiki();
    await writeFixture('wiki/DISCLAIMER.md', '# Missing required text');

    const result = await lintWiki(repoRoot);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          file: 'wiki/DISCLAIMER.md',
          message: 'wiki disclaimer must include zh-TW non-affiliation text',
        },
        {
          file: 'wiki/DISCLAIMER.md',
          message: 'wiki disclaimer must include English non-affiliation text',
        },
      ]),
    );
  });

  it('requires source refs to exist under raw', async () => {
    await writeValidWiki();
    await writeFixture(
      'wiki/products/iphone-17-pro.zh-TW.md',
      page({
        lang: 'zh-TW',
        siblingLang: 'en',
        siblingPath: 'products/iphone-17-pro.en.md',
        sourceRef: 'missing/source.md',
      }),
    );

    const result = await lintWiki(repoRoot);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          file: 'wiki/products/iphone-17-pro.zh-TW.md',
          message: 'source_ref must point into raw/: missing/source.md',
        },
        {
          file: 'wiki/products/iphone-17-pro.zh-TW.md',
          message: 'source_ref does not exist: missing/source.md',
        },
      ]),
    );
  });
});
