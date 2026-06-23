import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';
import { createFileWikiPageLoader } from '../../apps/api/src/generators/node-loaders.js';
import { createSalesScriptGenerateService } from '../../apps/api/src/generators/sales-script.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-sales-script-'));
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
    generateText: vi.fn(async () => ({
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
    })),
    streamText() {
      return {
        textStream: (async function* textStream() {
          yield text;
        })(),
      };
    },
  };
}

const wikiPage = `---
type: product
title: iPhone 17 Pro
slug: iphone-17-pro
lang: en
siblings: {}
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
human_owned_sections:
  - selling_points
---

# iPhone 17 Pro

## Overview

Sample page for validating sales script generation.
`;

describe('sales script generator service', () => {
  it('generates a FAB+P markdown sales script', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const llm = mockLLM(`# iPhone 17 Pro Sales Demo

## Feature

Use the validated wiki overview. [products/iphone-17-pro.en.md]

## Advantage

Explain why this helps in a retail demo.

## Benefit

Translate the feature into customer value.

## Proof

Point to the source-backed demo cue.
`);
    const service = createSalesScriptGenerateService({
      llm,
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });
    const app = createApiApp({
      generate: { service },
      middleware: { auth: false },
    });

    const response = await app.request('/api/generate', {
      body: JSON.stringify({
        kind: 'sales_script',
        lang: 'en',
        options: {
          duration_minutes: 10,
        },
        wiki_paths: ['products/iphone-17-pro.en.md'],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      content: string;
      kind: string;
      source_refs: string[];
    };

    expect(body.kind).toBe('sales_script');
    expect(body.content).toContain('## Feature');
    expect(body.content).toContain('## Advantage');
    expect(body.content).toContain('## Benefit');
    expect(body.content).toContain('## Proof');
    expect(body.source_refs).toEqual(['products/iphone-17-pro.en.md']);
    expect(llm.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: expect.any(AbortSignal),
        prompt: expect.stringContaining('Create a 10-minute retail sales demo script'),
      }),
    );
  });

  it('rejects sales scripts without all FAB+P sections', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const service = createSalesScriptGenerateService({
      llm: mockLLM(`# Sales Demo

## Feature

Only one section.`),
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    await expect(
      service.generate(
        {
          kind: 'sales_script',
          lang: 'en',
          options: {},
          wiki_paths: ['products/iphone-17-pro.en.md'],
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow(/Advantage/);
  });

  it('defaults unsupported duration values to three minutes', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const llm = mockLLM(`# Sales Demo

## Feature

Feature.

## Advantage

Advantage.

## Benefit

Benefit.

## Proof

Proof.
`);
    const service = createSalesScriptGenerateService({
      llm,
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    await service.generate(
      {
        kind: 'sales_script',
        lang: 'en',
        options: {
          duration_minutes: 5,
        },
        wiki_paths: ['products/iphone-17-pro.en.md'],
      },
      { signal: new AbortController().signal },
    );

    expect(llm.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Create a 3-minute retail sales demo script'),
      }),
    );
  });
});
