import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseWikiPage } from '@apple-llm-wiki/content';
import type { LLMProvider } from '@apple-llm-wiki/llm';
import { z } from 'zod';
import type { GenerateRequest, GenerateResponse, GenerateService } from '../routes/generate.js';

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

export type WikiPageLoader = (wikiPath: string) => Promise<string>;

export type QuizGeneratorOptions = {
  llm: LLMProvider;
  loadWikiPage: WikiPageLoader;
};

export type FileWikiPageLoaderOptions = {
  repoRoot: string;
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
    throw new Error(`Quiz generator returned invalid JSON: ${(error as Error).message}`);
  }
}

export function createFileWikiPageLoader(options: FileWikiPageLoaderOptions): WikiPageLoader {
  return async (wikiPath) => await readFile(join(options.repoRoot, 'wiki', wikiPath), 'utf8');
}

function buildQuizPrompt(input: {
  lang: GenerateRequest['lang'];
  questionCount: number;
  pages: Array<{
    path: string;
    title: string;
    sourceRefs: string[];
    content: string;
  }>;
}) {
  const context = input.pages
    .map(
      (page) => `### ${page.path}
Title: ${page.title}
Source refs: ${page.sourceRefs.join(', ')}

${page.content.trim()}`,
    )
    .join('\n\n');

  return `Create ${input.questionCount} multiple-choice quiz questions in ${input.lang}.

Rules:
- Return JSON only. No markdown fences.
- Use this exact JSON shape: {"questions":[{"question":"...","options":["..."],"answer":"...","explanation":"...","source_ref":"..."}]}.
- Each answer must exactly match one option.
- Each question must include source_ref copied from one provided wiki path.
- Do not invent facts beyond the provided wiki context.

Wiki context:
${context}`;
}

function validateQuizOutput(output: QuizOutput, wikiPaths: string[]) {
  const wikiPathSet = new Set(wikiPaths);

  for (const [index, question] of output.questions.entries()) {
    if (!question.options.includes(question.answer)) {
      throw new Error(`Quiz question ${index + 1} answer must match one option`);
    }

    if (!wikiPathSet.has(question.source_ref)) {
      throw new Error(`Quiz question ${index + 1} source_ref must cite a requested wiki path`);
    }
  }
}

export async function generateQuiz(
  request: GenerateRequest,
  context: { signal: AbortSignal },
  options: QuizGeneratorOptions,
): Promise<GenerateResponse> {
  const pages = await Promise.all(
    request.wiki_paths.map(async (wikiPath) => {
      const page = parseWikiPage(await options.loadWikiPage(wikiPath));

      return {
        content: page.content,
        path: wikiPath,
        sourceRefs: page.frontmatter.source_refs,
        title: page.frontmatter.title,
      };
    }),
  );
  const questionCount = parseQuestionCount(request.options);
  const result = await options.llm.generateText({
    abortSignal: context.signal,
    maxOutputTokens: 2_000,
    prompt: buildQuizPrompt({
      lang: request.lang,
      pages,
      questionCount,
    }),
    system: 'You generate source-grounded training quizzes from validated wiki pages.',
    temperature: 0.2,
  });
  const quiz = quizOutputSchema.parse(parseJsonObject(result.text));

  validateQuizOutput(quiz, request.wiki_paths);

  return {
    content: JSON.stringify(quiz, null, 2),
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
