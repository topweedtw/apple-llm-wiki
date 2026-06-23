import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';
import { createFileWikiPageLoader } from '../../apps/api/src/generators/node-loaders.js';
import { createVideoScriptGenerateService } from '../../apps/api/src/generators/video-script.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-video-script-'));
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

Sample page for validating video script generation.
`;

describe('video script generator service', () => {
  it('generates a two-pass markdown video script', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const llm = mockLLM(`# iPhone 17 Pro Training Video

## Pass 1: Fact Outline

- Use the validated wiki overview. [products/iphone-17-pro.en.md]

## Pass 2: Transcript and Storyboard

| Time | Transcript | Visual |
| --- | --- | --- |
| 0:00 | Introduce the training page. | Show title card. |
`);
    const service = createVideoScriptGenerateService({
      llm,
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });
    const app = createApiApp({
      generate: { service },
      middleware: { auth: false },
    });

    const response = await app.request('/api/generate', {
      body: JSON.stringify({
        kind: 'video_script',
        lang: 'en',
        options: {
          duration_minutes: 5,
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

    expect(body.kind).toBe('video_script');
    expect(body.content).toContain('## Pass 1: Fact Outline');
    expect(body.content).toContain('## Pass 2: Transcript and Storyboard');
    expect(body.source_refs).toEqual(['products/iphone-17-pro.en.md']);
    expect(llm.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: expect.any(AbortSignal),
        prompt: expect.stringContaining('Create a 5-minute training video script'),
      }),
    );
  });

  it('rejects video scripts without Pass 1', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const service = createVideoScriptGenerateService({
      llm: mockLLM(`## Pass 2: Transcript and Storyboard

Transcript only.`),
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    await expect(
      service.generate(
        {
          kind: 'video_script',
          lang: 'en',
          options: {},
          wiki_paths: ['products/iphone-17-pro.en.md'],
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow(/Pass 1/);
  });

  it('rejects video scripts without Pass 2', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const service = createVideoScriptGenerateService({
      llm: mockLLM(`## Pass 1: Fact Outline

Facts only.`),
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    await expect(
      service.generate(
        {
          kind: 'video_script',
          lang: 'en',
          options: {},
          wiki_paths: ['products/iphone-17-pro.en.md'],
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow(/Pass 2/);
  });

  it('accepts tolerant pass headings and warns when source refs are missing', async () => {
    await writeFixture('wiki/products/iphone-17-pro.en.md', wikiPage);
    const service = createVideoScriptGenerateService({
      llm: mockLLM(`### Pass 1 Fact Outline

- Source-grounded fact without an inline path.

### Pass 2 Transcript and Storyboard

Transcript only.`),
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    const response = await service.generate(
      {
        kind: 'video_script',
        lang: 'en',
        options: {
          duration_minutes: 2,
        },
        wiki_paths: ['products/iphone-17-pro.en.md'],
      },
      { signal: new AbortController().signal },
    );

    expect(response.warnings).toEqual([
      'Option "duration_minutes" was defaulted because 2 is not one of 1, 3, 5, or 10',
      'video_script output did not include explicit wiki source references.',
    ]);
  });
});
