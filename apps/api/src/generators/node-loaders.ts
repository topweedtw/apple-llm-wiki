import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DisclaimerLoader } from './disclaimer.js';
import { WikiPageNotFoundError } from './errors.js';
import type { WikiPageLoader } from './shared.js';

export type FileWikiPageLoaderOptions = {
  repoRoot: string;
};

export type FileDisclaimerLoaderOptions = {
  repoRoot: string;
};

function isNodeFileNotFound(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

export function createFileWikiPageLoader(options: FileWikiPageLoaderOptions): WikiPageLoader {
  return async (wikiPath) => {
    try {
      return await readFile(join(options.repoRoot, 'wiki', wikiPath), 'utf8');
    } catch (error) {
      if (isNodeFileNotFound(error)) {
        throw new WikiPageNotFoundError(wikiPath);
      }

      throw error;
    }
  };
}

export function createFileDisclaimerLoader(options: FileDisclaimerLoaderOptions): DisclaimerLoader {
  return async () => await readFile(join(options.repoRoot, 'wiki', 'DISCLAIMER.md'), 'utf8');
}
