import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseWikiPage } from '@apple-llm-wiki/content';

export type WikiIndexEntry = {
  title: string;
  path: string;
};

export type WikiLogEntry = {
  action: 'create' | 'update';
  page: string;
  sourceRefs: string[];
  timestamp: string;
};

export type WikiPageWrite = {
  action: WikiLogEntry['action'];
  markdown: string;
  path: string;
  timestamp: string;
};

async function readTextFile(path: string, fallback: string) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

function formatIndexEntry(entry: WikiIndexEntry) {
  return `- [${entry.title}](${entry.path})`;
}

function assertSourceRefs(sourceRefs: string[]) {
  if (sourceRefs.length === 0) {
    throw new Error('source_refs must contain at least one raw source reference');
  }
}

export async function upsertWikiIndexEntry(repoRoot: string, entry: WikiIndexEntry) {
  const indexPath = join(repoRoot, 'wiki/index.md');
  const current = await readTextFile(indexPath, '# Wiki Index\n');
  const line = formatIndexEntry(entry);
  const lines = current.trimEnd().split('\n');

  if (!lines.includes(line)) {
    lines.push(line);
  }

  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(indexPath, `${lines.join('\n')}\n`, 'utf8');
}

export async function appendWikiLogEntry(repoRoot: string, entry: WikiLogEntry) {
  assertSourceRefs(entry.sourceRefs);

  const logPath = join(repoRoot, 'wiki/log.md');
  const current = await readTextFile(logPath, '# Wiki Change Log\n');
  const sourceText = entry.sourceRefs.join(', ');
  const line = `- ${entry.timestamp} ${entry.action} ${entry.page} sources: ${sourceText}`;

  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(logPath, `${current.trimEnd()}\n${line}\n`, 'utf8');
}

export async function recordWikiWrite(
  repoRoot: string,
  indexEntry: WikiIndexEntry,
  logEntry: WikiLogEntry,
) {
  await upsertWikiIndexEntry(repoRoot, indexEntry);
  await appendWikiLogEntry(repoRoot, logEntry);
}

export async function writeWikiPage(repoRoot: string, write: WikiPageWrite) {
  const parsed = parseWikiPage(write.markdown);
  assertSourceRefs(parsed.frontmatter.source_refs);

  const pagePath = join(repoRoot, 'wiki', write.path);

  await mkdir(dirname(pagePath), { recursive: true });
  await writeFile(pagePath, write.markdown, 'utf8');
  await recordWikiWrite(
    repoRoot,
    {
      title: parsed.frontmatter.title,
      path: write.path,
    },
    {
      action: write.action,
      page: write.path,
      sourceRefs: parsed.frontmatter.source_refs,
      timestamp: write.timestamp,
    },
  );
}
