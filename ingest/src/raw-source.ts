import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as cheerio from 'cheerio';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type RawSourceCategory = 'web' | 'upload' | 'sample';

export type RawSourceRecord = {
  category: RawSourceCategory;
  content: string;
  contentType: string;
  fetchedAt: string;
  slug: string;
  title: string;
  url: string;
};

export type StoredRawSource = {
  contentPath: string;
  metaPath: string;
  record: RawSourceRecord;
};

export type FetchUrlSourceOptions = {
  category?: RawSourceCategory;
  fetchImpl?: FetchLike;
  fetchedAt?: string;
  timeoutMs?: number;
};

const defaultTimeoutMs = 30_000;

function assertValidUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('URL must use http or https');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`, { cause: error });
  }
}

export function slugFromUrl(url: string) {
  const parsed = assertValidUrl(url);
  const raw = `${parsed.hostname}${parsed.pathname}`
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return raw || 'source';
}

function extractHtml(html: string, url: string) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || new URL(url).hostname;

  $('script, style, noscript, svg').remove();

  const content = $('main').text().trim() || $('article').text().trim() || $('body').text().trim();

  return {
    content: content.replace(/\n{3,}/g, '\n\n'),
    title,
  };
}

function extractContent(responseText: string, contentType: string, url: string) {
  if (contentType.includes('text/html')) {
    return extractHtml(responseText, url);
  }

  return {
    content: responseText.trim(),
    title: new URL(url).hostname,
  };
}

async function assertFileDoesNotExist(path: string) {
  try {
    await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }

    throw error;
  }

  throw new Error(`Raw source already exists: ${path}`);
}

export async function storeRawSource(
  repoRoot: string,
  record: RawSourceRecord,
): Promise<StoredRawSource> {
  const basePath = join(repoRoot, 'raw', record.category, record.slug);
  const contentPath = `${basePath}.md`;
  const metaPath = `${basePath}.meta.json`;

  await assertFileDoesNotExist(contentPath);
  await assertFileDoesNotExist(metaPath);
  await mkdir(dirname(contentPath), { recursive: true });
  await writeFile(
    contentPath,
    `# ${record.title}\n\nSource: ${record.url}\nFetched: ${record.fetchedAt}\n\n${record.content}\n`,
    'utf8',
  );
  await writeFile(
    metaPath,
    `${JSON.stringify(
      {
        url: record.url,
        fetched_at: record.fetchedAt,
        title: record.title,
        content_type: record.contentType,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return { contentPath, metaPath, record };
}

export async function fetchUrlSource(
  repoRoot: string,
  url: string,
  options: FetchUrlSourceOptions = {},
) {
  const parsedUrl = assertValidUrl(url);
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(parsedUrl.toString(), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${parsedUrl.toString()}: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const responseText = await response.text();
    const extracted = extractContent(responseText, contentType, parsedUrl.toString());

    return await storeRawSource(repoRoot, {
      category: options.category ?? 'web',
      content: extracted.content,
      contentType,
      fetchedAt: options.fetchedAt ?? new Date().toISOString(),
      slug: slugFromUrl(parsedUrl.toString()),
      title: extracted.title,
      url: parsedUrl.toString(),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Timed out fetching ${parsedUrl.toString()} after ${timeoutMs}ms`, {
        cause: error,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
