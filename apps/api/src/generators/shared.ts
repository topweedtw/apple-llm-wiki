import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseWikiPage } from '@apple-llm-wiki/content';

export type WikiPageLoader = (wikiPath: string) => Promise<string>;

export type FileWikiPageLoaderOptions = {
  repoRoot: string;
};

export type LoadedWikiPage = {
  content: string;
  path: string;
  sourceRefs: string[];
  title: string;
};

export function createFileWikiPageLoader(options: FileWikiPageLoaderOptions): WikiPageLoader {
  return async (wikiPath) => await readFile(join(options.repoRoot, 'wiki', wikiPath), 'utf8');
}

export async function loadWikiPages(wikiPaths: string[], loadWikiPage: WikiPageLoader) {
  return await Promise.all(
    wikiPaths.map(async (wikiPath) => {
      const page = parseWikiPage(await loadWikiPage(wikiPath));

      return {
        content: page.content,
        path: wikiPath,
        sourceRefs: page.frontmatter.source_refs,
        title: page.frontmatter.title,
      };
    }),
  );
}

export function formatWikiContext(pages: LoadedWikiPage[]) {
  return pages
    .map(
      (page) => `### ${page.path}
Title: ${page.title}
Source refs: ${page.sourceRefs.join(', ')}

${page.content.trim()}`,
    )
    .join('\n\n');
}
