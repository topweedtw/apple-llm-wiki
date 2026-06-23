import type { LLMProvider } from '@apple-llm-wiki/llm';
import type {
  GenerateRequest,
  GenerateService,
  GenerateServiceResult,
} from '../routes/generate.js';
import { GeneratedOutputError } from './errors.js';
import {
  type WikiPageLoader,
  checkInlineSourceRefs,
  formatWikiContext,
  loadWikiPages,
} from './shared.js';
import { optionFallbackWarning } from './warnings.js';

export type SalesScriptGeneratorOptions = {
  llm: LLMProvider;
  loadWikiPage: WikiPageLoader;
};

function parseDurationMinutes(options: GenerateRequest['options']) {
  const value = options.duration_minutes;

  if (typeof value === 'number' && [1, 3, 10].includes(value)) {
    return {
      value,
      warnings: [],
    };
  }

  return {
    value: 3,
    warnings:
      value === undefined
        ? []
        : [
            optionFallbackWarning({
              name: 'duration_minutes',
              reason: 'is not one of 1, 3, or 10',
              value,
            }),
          ],
  };
}

function validateSalesScript(markdown: string) {
  if (!markdown.trim()) {
    throw new GeneratedOutputError('Sales script generator returned empty content');
  }

  const requiredSections = ['Feature', 'Advantage', 'Benefit', 'Proof'];

  for (const section of requiredSections) {
    const pattern = new RegExp(`^#{2,3}\\s+${section}\\b`, 'im');

    if (!pattern.test(markdown)) {
      throw new GeneratedOutputError(`Sales script must include "## ${section}" section`);
    }
  }
}

function buildSalesScriptPrompt(input: {
  context: string;
  durationMinutes: number;
  lang: GenerateRequest['lang'];
}) {
  return `Create a ${input.durationMinutes}-minute retail sales demo script in ${input.lang}.

Rules:
- Return markdown only.
- Use FAB+P exactly with these sections:
  ## Feature
  ## Advantage
  ## Benefit
  ## Proof
- Feature: state the product capability from the wiki context.
- Advantage: explain why that capability matters versus ordinary alternatives.
- Benefit: translate it into customer value.
- Proof: cite source-grounded evidence or a demo cue from the wiki context.
- Include source refs inline where factual claims are used.
- Do not invent facts beyond the provided wiki context.

Wiki context:
${input.context}`;
}

export async function generateSalesScript(
  request: GenerateRequest,
  context: { signal: AbortSignal },
  options: SalesScriptGeneratorOptions,
): Promise<GenerateServiceResult> {
  const pages = await loadWikiPages(request.wiki_paths, options.loadWikiPage);
  const durationMinutes = parseDurationMinutes(request.options);
  const result = await options.llm.generateText({
    abortSignal: context.signal,
    maxOutputTokens: 3_000,
    prompt: buildSalesScriptPrompt({
      context: formatWikiContext(pages),
      durationMinutes: durationMinutes.value,
      lang: request.lang,
    }),
    system: 'You generate source-grounded retail sales scripts from validated wiki pages.',
    temperature: 0.3,
  });

  validateSalesScript(result.text);

  return {
    content: result.text,
    content_type: 'markdown',
    kind: 'sales_script',
    source_refs: request.wiki_paths,
    warnings: [
      ...durationMinutes.warnings,
      ...checkInlineSourceRefs(result.text, request.wiki_paths),
    ],
  };
}

export function createSalesScriptGenerateService(
  options: SalesScriptGeneratorOptions,
): GenerateService {
  return {
    async generate(request, context) {
      if (request.kind !== 'sales_script') {
        throw new Error(`Generator not implemented: ${request.kind}`);
      }

      return await generateSalesScript(request, context, options);
    },
  };
}
