import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { WikiFrontmatter } from '@apple-llm-wiki/content';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { writeWikiPage } from './wiki-writer.js';

export type RewriteWikiPageInput = {
  action?: 'create' | 'update';
  humanOwnedSections?: string[];
  ingestManagedSections?: string[];
  lang: WikiFrontmatter['lang'];
  llm: LLMProvider;
  maxOutputTokens?: number;
  pageType: WikiFrontmatter['type'];
  sourcePath: string;
  status?: WikiFrontmatter['status'];
  tags?: string[];
  targetPath: string;
  temperature?: number;
  timestamp?: string;
  title: string;
};

export type RewrittenWikiPage = {
  markdown: string;
  path: string;
  protectedSections: string[];
};

function markdownDate(timestamp: string) {
  return timestamp.slice(0, 10);
}

function slugFromTargetPath(targetPath: string) {
  return basename(targetPath, '.md');
}

function normalizeForCopyCheck(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function assertTransformativeRewrite(source: string, rewritten: string) {
  const normalizedSource = normalizeForCopyCheck(source);
  const normalizedRewrite = normalizeForCopyCheck(rewritten);

  if (!normalizedRewrite) {
    throw new Error('LLM rewrite returned empty content');
  }

  if (
    normalizedSource.length >= 40 &&
    (normalizedRewrite === normalizedSource || normalizedRewrite.includes(normalizedSource))
  ) {
    throw new Error('LLM rewrite appears to copy the raw source verbatim');
  }
}

function sectionIdFromHeading(heading: string) {
  const withoutFormatting = heading
    .replace(/[`*_~]/g, '')
    .replace(/&/g, '')
    .trim()
    .toLowerCase();

  return withoutFormatting.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

type MarkdownSection = {
  id: string;
  start: number;
  end: number;
  markdown: string;
};

function findLevelTwoSections(markdown: string) {
  const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const sections: MarkdownSection[] = [];

  for (const [index, match] of matches.entries()) {
    if (match.index === undefined || match[1] === undefined) {
      continue;
    }

    const next = matches[index + 1];
    const end = next?.index ?? markdown.length;

    sections.push({
      end,
      id: sectionIdFromHeading(match[1]),
      markdown: markdown.slice(match.index, end).trimEnd(),
      start: match.index,
    });
  }

  return sections;
}

function replaceSection(markdown: string, section: MarkdownSection, replacement: string) {
  return `${markdown.slice(0, section.start).trimEnd()}\n\n${replacement.trimEnd()}\n\n${markdown
    .slice(section.end)
    .trimStart()}`.trimEnd();
}

async function readExistingWikiPage(repoRoot: string, targetPath: string) {
  try {
    return await readFile(join(repoRoot, 'wiki', targetPath), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

function preserveHumanOwnedSections(
  generated: string,
  existing: string | undefined,
  sectionIds: string[],
) {
  if (existing === undefined || sectionIds.length === 0) {
    return { markdown: generated.trimEnd(), protectedSections: [] };
  }

  let markdown = generated.trimEnd();
  const existingSections = new Map(
    findLevelTwoSections(existing).map((section) => [section.id, section]),
  );
  const protectedSections: string[] = [];

  for (const sectionId of sectionIds) {
    const existingSection = existingSections.get(sectionId);

    if (existingSection === undefined) {
      continue;
    }

    const generatedSection = findLevelTwoSections(markdown).find(
      (section) => section.id === sectionId,
    );
    markdown =
      generatedSection === undefined
        ? `${markdown.trimEnd()}\n\n${existingSection.markdown}`
        : replaceSection(markdown, generatedSection, existingSection.markdown);
    protectedSections.push(sectionId);
  }

  return { markdown, protectedSections };
}

function yamlStringList(values: string[]) {
  if (values.length === 0) {
    return ' []';
  }

  return `\n${values.map((value) => `  - ${JSON.stringify(value)}`).join('\n')}`;
}

function yamlString(value: string) {
  return JSON.stringify(value);
}

function buildWikiMarkdown(input: { body: string; frontmatter: WikiFrontmatter }) {
  const { body, frontmatter } = input;

  return `---
type: ${frontmatter.type}
title: ${yamlString(frontmatter.title)}
slug: ${yamlString(frontmatter.slug)}
lang: ${frontmatter.lang}
siblings: {}
status: ${frontmatter.status}
os_version: ${frontmatter.os_version === null ? 'null' : yamlString(frontmatter.os_version)}
last_updated: ${frontmatter.last_updated}
source_count: ${frontmatter.source_count}
source_refs:${yamlStringList(frontmatter.source_refs)}
tags:${yamlStringList(frontmatter.tags)}
ingest_managed_sections:${yamlStringList(frontmatter.ingest_managed_sections)}
human_owned_sections:${yamlStringList(frontmatter.human_owned_sections)}
---

${body.trimEnd()}
`;
}

function buildRewritePrompt(input: {
  rawSource: string;
  sourcePath: string;
  title: string;
  lang: WikiFrontmatter['lang'];
  humanOwnedSections: string[];
}) {
  return `Rewrite the raw source into a concise wiki page.

Rules:
- Write in ${input.lang}.
- Do not copy the raw source verbatim.
- Use markdown.
- Preserve these human-owned section ids if present in the existing page: ${input.humanOwnedSections.join(', ') || 'none'}.
- Include a final "## Sources" section with \`${input.sourcePath}\`.

Title: ${input.title}
Source path: ${input.sourcePath}

Raw source:
${input.rawSource}`;
}

export async function rewriteRawSourceToWikiPage(
  repoRoot: string,
  input: RewriteWikiPageInput,
): Promise<RewrittenWikiPage> {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const sourcePath = input.sourcePath.replace(/^\/+/, '');
  const rawSource = (await readFile(join(repoRoot, sourcePath), 'utf8')).trim();

  if (!rawSource) {
    throw new Error(`Raw source is empty: ${sourcePath}`);
  }

  const humanOwnedSections = input.humanOwnedSections ?? [];
  const ingestManagedSections = input.ingestManagedSections ?? ['overview', 'sources'];
  const result = await input.llm.generateText({
    maxOutputTokens: input.maxOutputTokens,
    prompt: buildRewritePrompt({
      humanOwnedSections,
      lang: input.lang,
      rawSource,
      sourcePath,
      title: input.title,
    }),
    system: 'You create source-grounded wiki pages from raw materials.',
    temperature: input.temperature ?? 0.2,
  });

  assertTransformativeRewrite(rawSource, result.text);

  const existing = await readExistingWikiPage(repoRoot, input.targetPath);
  const preserved = preserveHumanOwnedSections(result.text, existing, humanOwnedSections);
  const markdown = buildWikiMarkdown({
    body: preserved.markdown,
    frontmatter: {
      human_owned_sections: humanOwnedSections,
      ingest_managed_sections: ingestManagedSections,
      lang: input.lang,
      last_updated: markdownDate(timestamp),
      os_version: null,
      siblings: {},
      slug: slugFromTargetPath(input.targetPath),
      source_count: 1,
      source_refs: [sourcePath],
      status: input.status ?? 'draft',
      tags: input.tags ?? [],
      title: input.title,
      type: input.pageType,
    },
  });

  await writeWikiPage(repoRoot, {
    action: input.action ?? (existing === undefined ? 'create' : 'update'),
    markdown,
    path: input.targetPath,
    timestamp,
  });

  return {
    markdown,
    path: input.targetPath,
    protectedSections: preserved.protectedSections,
  };
}
