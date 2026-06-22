import { describe, expect, it, vi } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';
import type { GenerateService } from '../../apps/api/src/routes/generate.js';

function createGenerateApp(service?: GenerateService, timeoutMs = 60_000) {
  return createApiApp({
    generate: {
      service,
      timeoutMs,
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
