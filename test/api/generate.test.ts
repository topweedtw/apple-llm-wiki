import { describe, expect, it, vi } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';
import type { GenerateService } from '../../apps/api/src/routes/generate.js';

function createGenerateApp(service?: GenerateService, timeoutMs = 60_000) {
  return createApiApp({
    generate: {
      now: () => new Date('2026-06-22T00:00:00.000Z'),
      service,
      timeoutMs,
    },
    middleware: {
      auth: false,
    },
  });
}

function createGenerateAppWithDisclaimer(service: GenerateService) {
  return createApiApp({
    generate: {
      loadDisclaimer: async () => `# Disclaimer

## zh-TW

非官方中文聲明。

## en

Unofficial English disclaimer.`,
      now: () => new Date('2026-06-22T00:00:00.000Z'),
      service,
    },
    middleware: {
      auth: false,
    },
  });
}

describe('POST /api/generate', () => {
  it('validates and forwards generate requests to the configured service', async () => {
    const generate = vi.fn(async () => ({
      content: '# Quiz',
      content_type: 'markdown' as const,
      kind: 'quiz' as const,
      source_refs: ['wiki/products/iphone-17-pro.zh-TW.md'],
      warnings: [],
    }));
    const app = createGenerateApp({ generate });

    const response = await app.request('/api/generate', {
      body: JSON.stringify({
        kind: 'quiz',
        lang: 'zh-TW',
        options: {
          question_count: 5,
        },
        wiki_paths: ['products/iphone-17-pro.zh-TW.md'],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      content: '# Quiz',
      content_type: 'markdown',
      disclaimer: '',
      generated_at: '2026-06-22T00:00:00.000Z',
      kind: 'quiz',
      source_refs: ['wiki/products/iphone-17-pro.zh-TW.md'],
      warnings: [],
    });
    expect(generate).toHaveBeenCalledWith(
      {
        kind: 'quiz',
        lang: 'zh-TW',
        options: {
          question_count: 5,
        },
        wiki_paths: ['products/iphone-17-pro.zh-TW.md'],
      },
      {
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('injects a language-specific disclaimer when configured', async () => {
    const app = createGenerateAppWithDisclaimer({
      generate: async () => ({
        content: JSON.stringify({
          questions: [
            {
              answer: 'A',
              explanation: 'Because the source says so.',
              options: ['A', 'B'],
              question: 'Which option is correct?',
              source_ref: 'products/iphone-17-pro.zh-TW.md',
            },
          ],
        }),
        content_type: 'json',
        kind: 'quiz',
        source_refs: ['wiki/products/iphone-17-pro.zh-TW.md'],
        warnings: [],
      }),
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

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      content: string;
      disclaimer: string;
      generated_at: string;
    };
    expect(body.disclaimer).toBe('非官方中文聲明。');
    expect(body.generated_at).toBe('2026-06-22T00:00:00.000Z');
    expect(body.content).not.toContain('非官方中文聲明。');
    expect(JSON.parse(body.content)).toMatchObject({ questions: expect.any(Array) });
  });

  it('rejects invalid generate requests', async () => {
    const app = createGenerateApp({
      generate: async () => {
        throw new Error('should not be called');
      },
    });

    const response = await app.request('/api/generate', {
      body: JSON.stringify({
        kind: 'quiz',
        lang: 'zh-TW',
        wiki_paths: [],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; details: unknown[] };
    expect(body.error).toBe('Invalid generate request');
    expect(body.details.length).toBeGreaterThan(0);
  });

  it('fails closed when the generate service is not configured', async () => {
    const app = createGenerateApp(undefined);

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

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Generate service is not configured',
    });
  });

  it('times out slow generate requests predictably', async () => {
    let signal: AbortSignal | undefined;
    const app = createGenerateApp(
      {
        generate: async (_request, context) => {
          signal = context.signal;
          return await new Promise(() => {});
        },
      },
      1,
    );

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

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: 'Generate request timed out',
    });
    expect(signal?.aborted).toBe(true);
  });
});
