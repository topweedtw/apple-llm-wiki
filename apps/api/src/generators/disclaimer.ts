import type {
  GenerateApiResponse,
  GenerateRequest,
  GenerateServiceResult,
} from '../routes/generate.js';

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
  response: GenerateServiceResult,
  input: {
    disclaimer: string;
    generatedAt: string;
  },
): GenerateApiResponse {
  if (response.content_type === 'json' || !input.disclaimer) {
    return {
      ...response,
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
