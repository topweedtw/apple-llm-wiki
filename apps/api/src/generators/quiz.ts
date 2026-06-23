import type { LLMProvider } from '@apple-llm-wiki/llm';
import { z } from 'zod';
import type { GenerateRequest, GenerateResponse, GenerateService } from '../routes/generate.js';
import { GeneratedOutputError } from './errors.js';
import { type WikiPageLoader, formatWikiContext, loadWikiPages } from './shared.js';

export const quizQuestionSchema = z
  .object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(6),
    answer: z.string().min(1),
    explanation: z.string().min(1),
    source_ref: z.string().min(1),
  })
  .strict();

export const quizOutputSchema = z
  .object({
    questions: z.array(quizQuestionSchema).min(1).max(20),
  })
  .strict();

export type QuizOutput = z.infer<typeof quizOutputSchema>;

export type QuizGeneratorOptions = {
  llm: LLMProvider;
  loadWikiPage: WikiPageLoader;
};

function parseQuestionCount(options: GenerateRequest['options']) {
  const value = options.question_count;

  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 20) {
    return value;
  }

  return 5;
}

function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new GeneratedOutputError(
      `Quiz generator returned invalid JSON: ${(error as Error).message}`,
      {
        cause: error,
      },
    );
  }
}

function buildQuizPrompt(input: {
  lang: GenerateRequest['lang'];
  questionCount: number;
  context: string;
}) {
  return `Create ${input.questionCount} multiple-choice quiz questions in ${input.lang}.

Rules:
- Return JSON only. No markdown fences.
- Use this exact JSON shape: {"questions":[{"question":"...","options":["..."],"answer":"...","explanation":"...","source_ref":"..."}]}.
- Each answer must exactly match one option.
- Each question must include source_ref copied from one provided wiki path.
- Do not invent facts beyond the provided wiki context.

Wiki context:
${input.context}`;
}

function validateQuizOutput(output: QuizOutput, wikiPaths: string[]) {
  const wikiPathSet = new Set(wikiPaths);

  for (const [index, question] of output.questions.entries()) {
    if (!question.options.includes(question.answer)) {
      throw new GeneratedOutputError(`Quiz question ${index + 1} answer must match one option`);
    }

    if (!wikiPathSet.has(question.source_ref)) {
      throw new GeneratedOutputError(
        `Quiz question ${index + 1} source_ref must cite a requested wiki path`,
      );
    }
  }
}

export async function generateQuiz(
  request: GenerateRequest,
  context: { signal: AbortSignal },
  options: QuizGeneratorOptions,
): Promise<GenerateResponse> {
  const pages = await loadWikiPages(request.wiki_paths, options.loadWikiPage);
  const questionCount = parseQuestionCount(request.options);
  const result = await options.llm.generateText({
    abortSignal: context.signal,
    maxOutputTokens: 2_000,
    prompt: buildQuizPrompt({
      context: formatWikiContext(pages),
      lang: request.lang,
      questionCount,
    }),
    system: 'You generate source-grounded training quizzes from validated wiki pages.',
    temperature: 0.2,
  });
  const parsed = quizOutputSchema.safeParse(parseJsonObject(result.text));

  if (!parsed.success) {
    throw new GeneratedOutputError('Quiz generator returned invalid quiz JSON', {
      cause: parsed.error,
    });
  }

  validateQuizOutput(parsed.data, request.wiki_paths);

  return {
    content: JSON.stringify(parsed.data, null, 2),
    kind: 'quiz',
    source_refs: request.wiki_paths,
    warnings: [],
  };
}

export function createQuizGenerateService(options: QuizGeneratorOptions): GenerateService {
  return {
    async generate(request, context) {
      if (request.kind !== 'quiz') {
        throw new Error(`Generator not implemented: ${request.kind}`);
      }

      return await generateQuiz(request, context, options);
    },
  };
}
