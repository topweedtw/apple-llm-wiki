import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
  const logPath = join(repoRoot, 'wiki/log.md');
  const current = await readTextFile(logPath, '# Wiki Change Log\n');
  const sourceText = entry.sourceRefs.length > 0 ? entry.sourceRefs.join(', ') : 'none';
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
