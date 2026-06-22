import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { type ParsedWikiPage, parseWikiPage } from './frontmatter.js';

export type WikiLintIssue = {
  file: string;
  message: string;
};

export type WikiLintResult = {
  issues: WikiLintIssue[];
};

export type WikiLintOptions = {
  redLineTerms?: string[];
};

const defaultRedLineTerms = [
  'rumor',
  'rumors',
  'leak',
  'leaked',
  'unannounced',
  '未發表',
  '傳聞',
  '爆料',
];

const nonPageFiles = new Set(['DISCLAIMER.md', 'index.md', 'log.md']);

function toRepoPath(path: string) {
  return path.split(sep).join('/');
}

async function collectMarkdownFiles(root: string, dir = root): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        return await collectMarkdownFiles(root, path);
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        return [path];
      }

      return [];
    }),
  );

  return files.flat();
}

async function readIfExists(path: string) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

function findRedLineTerms(content: string, terms: string[]) {
  const lowerContent = content.toLowerCase();

  return terms.filter((term) => lowerContent.includes(term.toLowerCase()));
}

function lintDisclaimer(repoRoot: string, disclaimer: string | undefined): WikiLintIssue[] {
  if (disclaimer === undefined) {
    return [
      {
        file: 'wiki/DISCLAIMER.md',
        message: 'wiki disclaimer is required',
      },
    ];
  }

  const issues: WikiLintIssue[] = [];

  if (!disclaimer.includes('非官方')) {
    issues.push({
      file: 'wiki/DISCLAIMER.md',
      message: 'wiki disclaimer must include zh-TW non-affiliation text',
    });
  }

  if (!disclaimer.toLowerCase().includes('not affiliated')) {
    issues.push({
      file: 'wiki/DISCLAIMER.md',
      message: 'wiki disclaimer must include English non-affiliation text',
    });
  }

  return issues.map((issue) => ({
    ...issue,
    file: toRepoPath(relative(repoRoot, join(repoRoot, issue.file))),
  }));
}

function lintSiblingSymmetry(input: {
  currentPath: string;
  pagesByPath: Map<string, ParsedWikiPage>;
  repoRoot: string;
}) {
  const current = input.pagesByPath.get(input.currentPath);

  if (current === undefined) {
    return [];
  }

  const issues: WikiLintIssue[] = [];
  const currentWikiPath = toRepoPath(relative(join(input.repoRoot, 'wiki'), input.currentPath));

  for (const [lang, siblingPath] of Object.entries(current.frontmatter.siblings)) {
    if (siblingPath === undefined) {
      continue;
    }

    const siblingFullPath = join(input.repoRoot, 'wiki', siblingPath);
    const sibling = input.pagesByPath.get(siblingFullPath);

    if (sibling === undefined) {
      issues.push({
        file: toRepoPath(relative(input.repoRoot, input.currentPath)),
        message: `sibling does not exist: ${siblingPath}`,
      });
      continue;
    }

    if (sibling.frontmatter.lang !== lang) {
      issues.push({
        file: toRepoPath(relative(input.repoRoot, input.currentPath)),
        message: `sibling ${siblingPath} has lang ${sibling.frontmatter.lang}, expected ${lang}`,
      });
    }

    const reverseSibling = sibling.frontmatter.siblings[current.frontmatter.lang];

    if (reverseSibling !== currentWikiPath) {
      issues.push({
        file: toRepoPath(relative(input.repoRoot, siblingFullPath)),
        message: `sibling must point back to ${currentWikiPath}`,
      });
    }
  }

  return issues;
}

function lintSourceRefs(input: {
  page: ParsedWikiPage;
  pagePath: string;
  repoRoot: string;
}) {
  return input.page.frontmatter.source_refs
    .filter((sourceRef) => !sourceRef.startsWith('raw/'))
    .map((sourceRef) => ({
      file: toRepoPath(relative(input.repoRoot, input.pagePath)),
      message: `source_ref must point into raw/: ${sourceRef}`,
    }));
}

async function lintExistingSourceRefs(input: {
  page: ParsedWikiPage;
  pagePath: string;
  repoRoot: string;
}) {
  const issues: WikiLintIssue[] = [];

  for (const sourceRef of input.page.frontmatter.source_refs) {
    const source = await readIfExists(join(input.repoRoot, sourceRef));

    if (source === undefined) {
      issues.push({
        file: toRepoPath(relative(input.repoRoot, input.pagePath)),
        message: `source_ref does not exist: ${sourceRef}`,
      });
    }
  }

  return issues;
}

export async function lintWiki(
  repoRoot: string,
  options: WikiLintOptions = {},
): Promise<WikiLintResult> {
  const wikiRoot = join(repoRoot, 'wiki');
  const redLineTerms = options.redLineTerms ?? defaultRedLineTerms;
  const markdownFiles = await collectMarkdownFiles(wikiRoot);
  const issues: WikiLintIssue[] = [];
  const pagesByPath = new Map<string, ParsedWikiPage>();

  for (const filePath of markdownFiles) {
    const repoPath = toRepoPath(relative(repoRoot, filePath));
    const content = await readFile(filePath, 'utf8');
    const redLineMatches = findRedLineTerms(content, redLineTerms);

    if (redLineMatches.length > 0) {
      issues.push({
        file: repoPath,
        message: `red-line term found: ${redLineMatches.join(', ')}`,
      });
    }

    if (nonPageFiles.has(toRepoPath(relative(wikiRoot, filePath)))) {
      continue;
    }

    try {
      pagesByPath.set(filePath, parseWikiPage(content));
    } catch (error) {
      issues.push({
        file: repoPath,
        message: `invalid wiki frontmatter: ${(error as Error).message}`,
      });
    }
  }

  for (const [pagePath, page] of pagesByPath) {
    issues.push(...lintSiblingSymmetry({ currentPath: pagePath, pagesByPath, repoRoot }));
    issues.push(...lintSourceRefs({ page, pagePath, repoRoot }));
    issues.push(...(await lintExistingSourceRefs({ page, pagePath, repoRoot })));
  }

  issues.push(...lintDisclaimer(repoRoot, await readIfExists(join(wikiRoot, 'DISCLAIMER.md'))));

  return { issues };
}

export function formatWikiLintIssues(issues: WikiLintIssue[]) {
  return issues.map((issue) => `${issue.file}: ${issue.message}`).join('\n');
}
