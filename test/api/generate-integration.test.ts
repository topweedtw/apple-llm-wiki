import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';
import { createCompositeGenerateService } from '../../apps/api/src/generators/composite.js';
import {
  createFileDisclaimerLoader,
  createFileWikiPageLoader,
} from '../../apps/api/src/generators/node-loaders.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-generate-integration-'));
  await writeFixture(
    'wiki/DISCLAIMER.md',
    `# Disclaimer

## zh-TW

非官方中文聲明。

## en

Unofficial English disclaimer.
`,
  );
  await writeWikiPage(
    'products/iphone-17-pro.zh-TW.md',
    `# iPhone 17 Pro

iPhone 17 Pro has a titanium frame and an A19 Pro chip.`,
  );
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

async function writeFixture(path: string, content: string) {
  const fullPath = join(repoRoot, path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

async function writeWikiPage(path: string, content: string) {
  await writeFixture(
    join('wiki', path),
    `---
type: "product"
title: "iPhone 17 Pro"
slug: "iphone-17-pro"
lang: "zh-TW"
siblings: {}
status: "current"
os_version: null
last_updated: "2026-06-22"
source_count: 1
source_refs:
  - "raw/apple/iphone-17-pro.md"
tags: []
ingest_managed_sections: []
human_owned_sections: []
---

${content}`,
  );
}

function createMockLLM(): LLMProvider {
  return {
    async generateText(input) {
      if (input.prompt.includes('Return JSON only')) {
        return {
          text: JSON.stringify({
            questions: [
              {
                answer: 'A19 Pro',
                explanation: 'The wiki context states the chip name.',
                options: ['A19 Pro', 'M4', 'A18'],
                question: 'Which chip is listed in the wiki context?',
                source_ref: 'products/iphone-17-pro.zh-TW.md',
              },
            ],
          }),
          warnings: [],
        };
      }

      if (input.prompt.includes('Transcript and Storyboard')) {
        return {
          text: `## Pass 1: Fact Outline
- iPhone 17 Pro has an A19 Pro chip. [products/iphone-17-pro.zh-TW.md]

## Pass 2: Transcript and Storyboard
### Scene 1
**Narration:** Introduce the A19 Pro chip.`,
          warnings: [],
        };
      }

      return {
        text: `## Feature
A19 Pro chip. [products/iphone-17-pro.zh-TW.md]

## Advantage
It gives the product a clear performance story.

## Benefit
Customers understand why the upgrade matters.

## Proof
The wiki context cites the A19 Pro chip.`,
        warnings: [],
      };
    },
    streamText() {
      throw new Error('streamText is not used in generate integration tests');
    },
  };
}

function createGenerateApp(llm: LLMProvider = createMockLLM()) {
  return createApiApp({
    generate: {
      loadDisclaimer: createFileDisclaimerLoader({ repoRoot }),
      now: () => new Date('2026-06-22T00:00:00.000Z'),
      service: createCompositeGenerateService({
        llm,
        loadWikiPage: createFileWikiPageLoader({ repoRoot }),
      }),
    },
    middleware: {
      auth: false,
    },
  });
}

async function postGenerate(kind: 'quiz' | 'video_script' | 'sales_script', wikiPaths?: string[]) {
  return await createGenerateApp().request('/api/generate', {
    body: JSON.stringify({
      kind,
      lang: 'zh-TW',
      wiki_paths: wikiPaths ?? ['products/iphone-17-pro.zh-TW.md'],
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
}

describe('POST /api/generate integration', () => {
  it('routes quiz generation through composite service without breaking JSON content', async () => {
    const response = await postGenerate('quiz');

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      content: string;
      disclaimer: string;
      generated_at: string;
      kind: string;
    };
    expect(body.kind).toBe('quiz');
    expect(body.disclaimer).toBe('非官方中文聲明。');
    expect(body.generated_at).toBe('2026-06-22T00:00:00.000Z');
    expect(JSON.parse(body.content)).toMatchObject({
      disclaimer: '非官方中文聲明。',
      generated_at: '2026-06-22T00:00:00.000Z',
      questions: expect.any(Array),
    });
  });

  it('routes video script generation and prepends disclaimer to markdown', async () => {
    const response = await postGenerate('video_script');

    expect(response.status).toBe(200);
    const body = (await response.json()) as { content: string; kind: string };
    expect(body.kind).toBe('video_script');
    expect(body.content).toMatch(/^> 非官方中文聲明。\n\n## Pass 1:/);
  });

  it('routes sales script generation and prepends disclaimer to markdown', async () => {
    const response = await postGenerate('sales_script');

    expect(response.status).toBe(200);
    const body = (await response.json()) as { content: string; kind: string };
    expect(body.kind).toBe('sales_script');
    expect(body.content).toMatch(/^> 非官方中文聲明。\n\n## Feature/);
  });

  it('returns 400 for missing wiki paths without leaking filesystem paths', async () => {
    const response = await postGenerate('quiz', ['products/missing.zh-TW.md']);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { details: Array<{ message: string }>; error: string };
    expect(body.error).toBe('Wiki page not found');
    expect(body.details[0]?.message).toBe('Wiki page not found: products/missing.zh-TW.md');
    expect(JSON.stringify(body)).not.toContain(repoRoot);
  });

  it('returns 502 when a generator returns malformed output', async () => {
    const app = createGenerateApp({
      async generateText() {
        return {
          text: 'not json',
          warnings: [],
        };
      },
      streamText() {
        throw new Error('streamText is not used in generate integration tests');
      },
    });

    const response = await app.request('/api/generate', {
      body: JSON.stringify({
        kind: 'quiz',
        lang: 'zh-TW',
        wiki_paths: ['products/iphone-17-pro.zh-TW.md'],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Bad generated output',
    });
  });
});
