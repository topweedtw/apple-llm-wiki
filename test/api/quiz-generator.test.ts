import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';
import { createFileWikiPageLoader } from '../../apps/api/src/generators/node-loaders.js';
import { createQuizGenerateService } from '../../apps/api/src/generators/quiz.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-quiz-'));
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
lang: zh-TW
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

Sample page for validating quiz generation.
`;

describe('quiz generator service', () => {
  it('generates validated quiz JSON from requested wiki paths', async () => {
    await writeFixture('wiki/products/iphone-17-pro.zh-TW.md', wikiPage);
    const llm = mockLLM(
      JSON.stringify({
        questions: [
          {
            answer: 'A training sample',
            explanation: 'The wiki page says it is a sample page.',
            options: ['A training sample', 'A repair guide', 'A price list'],
            question: 'What is this wiki page used for?',
            source_ref: 'products/iphone-17-pro.zh-TW.md',
          },
        ],
      }),
    );
    const service = createQuizGenerateService({
      llm,
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });
    const app = createApiApp({
      generate: { service },
      middleware: { auth: false },
    });

    const response = await app.request('/api/generate', {
      body: JSON.stringify({
        kind: 'quiz',
        lang: 'zh-TW',
        options: {
          question_count: 1,
        },
        wiki_paths: ['products/iphone-17-pro.zh-TW.md'],
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
      warnings: string[];
    };
    const quiz = JSON.parse(body.content) as {
      questions: Array<{ source_ref: string; answer: string; options: string[] }>;
    };

    expect(body.kind).toBe('quiz');
    expect(body.source_refs).toEqual(['products/iphone-17-pro.zh-TW.md']);
    expect(body.warnings).toEqual([]);
    expect(quiz.questions[0]?.source_ref).toBe('products/iphone-17-pro.zh-TW.md');
    expect(quiz.questions[0]?.options).toContain(quiz.questions[0]?.answer);
    expect(llm.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: expect.any(AbortSignal),
        system: 'You generate source-grounded training quizzes from validated wiki pages.',
      }),
    );
  });

  it('rejects quiz JSON when answer does not match an option', async () => {
    await writeFixture('wiki/products/iphone-17-pro.zh-TW.md', wikiPage);
    const service = createQuizGenerateService({
      llm: mockLLM(
        JSON.stringify({
          questions: [
            {
              answer: 'Not in options',
              explanation: 'Bad output.',
              options: ['A', 'B'],
              question: 'Bad question?',
              source_ref: 'products/iphone-17-pro.zh-TW.md',
            },
          ],
        }),
      ),
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    await expect(
      service.generate(
        {
          kind: 'quiz',
          lang: 'en',
          options: {},
          wiki_paths: ['products/iphone-17-pro.zh-TW.md'],
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow(/answer must match one option/);
  });

  it('rejects quiz JSON without requested source refs', async () => {
    await writeFixture('wiki/products/iphone-17-pro.zh-TW.md', wikiPage);
    const service = createQuizGenerateService({
      llm: mockLLM(
        JSON.stringify({
          questions: [
            {
              answer: 'A',
              explanation: 'Bad source.',
              options: ['A', 'B'],
              question: 'Bad source?',
              source_ref: 'products/other.md',
            },
          ],
        }),
      ),
      loadWikiPage: createFileWikiPageLoader({ repoRoot }),
    });

    await expect(
      service.generate(
        {
          kind: 'quiz',
          lang: 'en',
          options: {},
          wiki_paths: ['products/iphone-17-pro.zh-TW.md'],
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow(/source_ref must cite/);
  });
});
