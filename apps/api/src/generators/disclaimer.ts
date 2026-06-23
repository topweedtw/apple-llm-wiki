import type { GenerateRequest, GenerateResponse } from '../routes/generate.js';
import { GeneratedOutputError } from './errors.js';

export type DisclaimerLoader = () => Promise<string>;

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
  if (response.kind === 'quiz') {
    let content: unknown;

    try {
      content = JSON.parse(response.content);
    } catch (error) {
      throw new GeneratedOutputError(
        'Quiz content must be valid JSON before disclaimer injection',
        {
          cause: error,
        },
      );
    }

    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      throw new GeneratedOutputError('Quiz content must be a JSON object');
    }

    return {
      ...response,
      content: JSON.stringify(
        {
          ...content,
          disclaimer: input.disclaimer,
          generated_at: input.generatedAt,
        },
        null,
        2,
      ),
      disclaimer: input.disclaimer,
      generated_at: input.generatedAt,
    };
  }

  return {
    ...response,
    content: `> ${input.disclaimer}\n\n${response.content}`,
    disclaimer: input.disclaimer,
    generated_at: input.generatedAt,
  };
}
