import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rewriteRawSourceToWikiPage } from '../../ingest/src/index.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-rewrite-'));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

async function writeFixture(path: string, content: string) {
  const fullPath = join(repoRoot, path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

function mockLLM(text: string): LLMProvider {
  return {
    async generateText() {
      return {
        finishReason: 'stop',
        text,
        totalUsage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
      };
    },
    streamText() {
      return {
        textStream: (async function* textStream() {
          yield text;
        })(),
      };
    },
  };
}

describe('LLM source rewrite flow', () => {
  it('rewrites a raw source into a validated wiki page with source refs', async () => {
    await writeFixture(
      'raw/upload/apple-training.md',
      'Apple training source explains product positioning, camera improvements, and demo flow.',
    );

    await rewriteRawSourceToWikiPage(repoRoot, {
      lang: 'zh-TW',
      llm: mockLLM(`# Apple Training

## Overview

這是一份重新整理後的產品訓練頁。

## Sources

- \`raw/upload/apple-training.md\``),
      pageType: 'product',
      sourcePath: 'raw/upload/apple-training.md',
      tags: ['training'],
      targetPath: 'products/apple-training.zh-TW.md',
      timestamp: '2026-06-22T00:00:00.000Z',
      title: 'Apple Training',
    });

    const page = await readFile(join(repoRoot, 'wiki/products/apple-training.zh-TW.md'), 'utf8');
    const index = await readFile(join(repoRoot, 'wiki/index.md'), 'utf8');
    const log = await readFile(join(repoRoot, 'wiki/log.md'), 'utf8');

    expect(page).toContain('source_refs:');
    expect(page).toContain('"raw/upload/apple-training.md"');
    expect(page).toContain('這是一份重新整理後的產品訓練頁。');
    expect(index).toContain('- [Apple Training](products/apple-training.zh-TW.md)');
    expect(log).toContain(
      'create products/apple-training.zh-TW.md sources: raw/upload/apple-training.md',
    );
  });

  it('preserves human-owned sections from the existing wiki page', async () => {
    await writeFixture(
      'raw/upload/demo.md',
      'Raw source with enough words to require a rewritten summary.',
    );
    await writeFixture(
      'wiki/products/demo.zh-TW.md',
      `---
type: product
title: Demo
slug: demo.zh-TW
lang: zh-TW
siblings: {}
status: draft
os_version: null
last_updated: 2026-06-21
source_count: 1
source_refs:
  - raw/upload/demo.md
tags: []
ingest_managed_sections:
  - overview
human_owned_sections:
  - selling_points
---

# Demo

## Overview

Old generated overview.

## Selling Points

Human-written pitch must stay.
`,
    );

    const result = await rewriteRawSourceToWikiPage(repoRoot, {
      action: 'update',
      humanOwnedSections: ['selling_points'],
      lang: 'zh-TW',
      llm: mockLLM(`# Demo

## Overview

New generated overview.

## Selling Points

LLM-generated pitch should not survive.

## Sources

- \`raw/upload/demo.md\``),
      pageType: 'product',
      sourcePath: 'raw/upload/demo.md',
      targetPath: 'products/demo.zh-TW.md',
      timestamp: '2026-06-22T00:00:00.000Z',
      title: 'Demo',
    });

    const page = await readFile(join(repoRoot, 'wiki/products/demo.zh-TW.md'), 'utf8');

    expect(result.protectedSections).toEqual(['selling_points']);
    expect(page).toContain('New generated overview.');
    expect(page).toContain('Human-written pitch must stay.');
    expect(page).not.toContain('LLM-generated pitch should not survive.');
  });

  it('rejects LLM output that copies the raw source verbatim', async () => {
    const rawSource =
      'This raw source has a distinctive sentence that should not be copied verbatim into the wiki page.';
    await writeFixture('raw/upload/copy.md', rawSource);

    await expect(
      rewriteRawSourceToWikiPage(repoRoot, {
        lang: 'en',
        llm: mockLLM(rawSource),
        pageType: 'product',
        sourcePath: 'raw/upload/copy.md',
        targetPath: 'products/copy.en.md',
        title: 'Copy',
      }),
    ).rejects.toThrow(/copy the raw source verbatim/);
  });
});
