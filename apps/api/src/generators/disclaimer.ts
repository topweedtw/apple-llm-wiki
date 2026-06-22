import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GenerateRequest, GenerateResponse } from '../routes/generate.js';

export type DisclaimerLoader = () => Promise<string>;

export type FileDisclaimerLoaderOptions = {
  repoRoot: string;
};

export function createFileDisclaimerLoader(options: FileDisclaimerLoaderOptions): DisclaimerLoader {
  return async () => await readFile(join(options.repoRoot, 'wiki', 'DISCLAIMER.md'), 'utf8');
}

function extractSection(markdown: string, heading: string) {
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const matchIndex = headings.findIndex((match) => match[1]?.trim() === heading);

  if (matchIndex === -1) {
    return undefined;
  }

  const match = headings[matchIndex];
  const next = headings[matchIndex + 1];

  if (match?.index === undefined || match[0] === undefined) {
    return undefined;
  }

  return markdown.slice(match.index + match[0].length, next?.index ?? markdown.length).trim();
}

export function selectDisclaimer(markdown: string, lang: GenerateRequest['lang']) {
  const section = extractSection(markdown, lang);

  if (!section) {
    throw new Error(`Disclaimer section not found: ${lang}`);
  }

  return section;
}

export function applyDisclaimer(
  response: GenerateResponse,
  input: {
    disclaimer: string;
    generatedAt: string;
  },
): GenerateResponse {
  return {
    ...response,
    content: `> ${input.disclaimer}\n\n${response.content}`,
    disclaimer: input.disclaimer,
    generated_at: input.generatedAt,
  };
}
