import type { GenerateRequest } from '../routes/generate.js';

export function optionFallbackWarning(input: {
  name: string;
  reason: string;
  value: GenerateRequest['options'][string] | undefined;
}) {
  return `Option "${input.name}" was defaulted because ${JSON.stringify(input.value)} ${input.reason}`;
}

export function missingSourceRefsWarning(kind: GenerateRequest['kind']) {
  return `${kind} output did not include explicit wiki source references.`;
}

export function markdownContainsAnySourceRef(markdown: string, wikiPaths: string[]) {
  return wikiPaths.some((wikiPath) => markdown.includes(wikiPath));
}
