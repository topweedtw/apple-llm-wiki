import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fetchUrlSource, slugFromUrl } from '../../ingest/src/index.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-raw-'));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

function createFetchResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, init);
}

describe('raw URL source ingestion', () => {
  it('creates a stable slug from a URL', () => {
    expect(slugFromUrl('https://www.apple.com/iphone-17-pro/specs/')).toBe(
      'www-apple-com-iphone-17-pro-specs',
    );
  });

  it('fetches HTML and stores raw markdown plus metadata', async () => {
    const result = await fetchUrlSource(repoRoot, 'https://example.com/products/iphone.html', {
      fetchedAt: '2026-06-22T00:00:00.000Z',
      fetchImpl: async () =>
        createFetchResponse(
          '<html><head><title>Example iPhone</title></head><body><main><h1>Example</h1><p>Body text.</p></main></body></html>',
          {
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
            status: 200,
          },
        ),
    });

    const markdown = await readFile(result.contentPath, 'utf8');
    const meta = JSON.parse(await readFile(result.metaPath, 'utf8')) as Record<string, unknown>;

    expect(result.contentPath).toMatch(/raw\/web\/example-com-products-iphone\.md$/);
    expect(markdown).toContain('# Example iPhone');
    expect(markdown).toContain('Body text.');
    expect(meta).toEqual({
      url: 'https://example.com/products/iphone.html',
      fetched_at: '2026-06-22T00:00:00.000Z',
      title: 'Example iPhone',
      content_type: 'text/html; charset=utf-8',
    });
  });

  it('rejects invalid URLs', async () => {
    await expect(fetchUrlSource(repoRoot, 'not-a-url')).rejects.toThrow(/Invalid URL/);
  });

  it('rejects non-2xx responses with the status code', async () => {
    await expect(
      fetchUrlSource(repoRoot, 'https://example.com/missing', {
        fetchImpl: async () => createFetchResponse('missing', { status: 404 }),
      }),
    ).rejects.toThrow(/HTTP 404/);
  });

  it('does not overwrite existing raw files', async () => {
    const fetchImpl = async () =>
      createFetchResponse('<html><title>Example</title><body>Body</body></html>', {
        headers: {
          'content-type': 'text/html',
        },
        status: 200,
      });

    await fetchUrlSource(repoRoot, 'https://example.com/page', { fetchImpl });

    await expect(
      fetchUrlSource(repoRoot, 'https://example.com/page', { fetchImpl }),
    ).rejects.toThrow(/already exists/);
  });
});
