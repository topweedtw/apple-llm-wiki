import type { LLMProvider } from '@apple-llm-wiki/llm';
import type { GenerateRequest, GenerateResponse, GenerateService } from '../routes/generate.js';
import { GeneratedOutputError } from './errors.js';
import { type WikiPageLoader, formatWikiContext, loadWikiPages } from './shared.js';

export type VideoScriptGeneratorOptions = {
  llm: LLMProvider;
  loadWikiPage: WikiPageLoader;
};

function parseDurationMinutes(options: GenerateRequest['options']) {
  const value = options.duration_minutes;

  if (typeof value === 'number' && [1, 3, 5, 10].includes(value)) {
    return value;
  }

  return 3;
}

function validateVideoScript(markdown: string) {
  if (!markdown.trim()) {
    throw new GeneratedOutputError('Video script generator returned empty content');
  }

  if (!/^## Pass 1:/m.test(markdown)) {
    throw new GeneratedOutputError('Video script must include "## Pass 1:" section');
  }

  if (!/^## Pass 2:/m.test(markdown)) {
    throw new GeneratedOutputError('Video script must include "## Pass 2:" section');
  }
}

function buildVideoScriptPrompt(input: {
  context: string;
  durationMinutes: number;
  lang: GenerateRequest['lang'];
}) {
  return `Create a ${input.durationMinutes}-minute training video script in ${input.lang}.

Rules:
- Return markdown only.
- Use this exact two-pass structure:
  ## Pass 1: Fact Outline
  ## Pass 2: Transcript and Storyboard
- Pass 1 must list only source-grounded facts from the wiki context.
- Pass 2 must include spoken transcript and visual/storyboard notes.
- Include source refs inline where factual claims are used.
- Do not invent facts beyond the provided wiki context.

Wiki context:
${input.context}`;
}

export async function generateVideoScript(
  request: GenerateRequest,
  context: { signal: AbortSignal },
  options: VideoScriptGeneratorOptions,
): Promise<GenerateResponse> {
  const pages = await loadWikiPages(request.wiki_paths, options.loadWikiPage);
  const durationMinutes = parseDurationMinutes(request.options);
  const result = await options.llm.generateText({
    abortSignal: context.signal,
    maxOutputTokens: 3_500,
    prompt: buildVideoScriptPrompt({
      context: formatWikiContext(pages),
      durationMinutes,
      lang: request.lang,
    }),
    system: 'You generate source-grounded training video scripts from validated wiki pages.',
    temperature: 0.3,
  });

  validateVideoScript(result.text);

  return {
    content: result.text,
    kind: 'video_script',
    source_refs: request.wiki_paths,
    warnings: [],
  };
}

export function createVideoScriptGenerateService(
  options: VideoScriptGeneratorOptions,
): GenerateService {
  return {
    async generate(request, context) {
      if (request.kind !== 'video_script') {
        throw new Error(`Generator not implemented: ${request.kind}`);
      }

      return await generateVideoScript(request, context, options);
    },
  };
}
