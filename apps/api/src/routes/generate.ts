import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../env.js';
import {
  type DisclaimerLoader,
  applyDisclaimer,
  selectDisclaimer,
} from '../generators/disclaimer.js';
import { GeneratedOutputError, WikiPageNotFoundError } from '../generators/errors.js';

export const generatorKindSchema = z.enum(['quiz', 'video_script', 'sales_script']);
export const generateRequestSchema = z
  .object({
    kind: generatorKindSchema,
    lang: z.enum(['zh-TW', 'en']),
    wiki_paths: z.array(z.string().min(1)).min(1).max(10),
    options: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .default({}),
  })
  .strict();

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export type GenerateResponse = {
  kind: GenerateRequest['kind'];
  content: string;
  disclaimer?: string;
  generated_at?: string;
  source_refs: string[];
  warnings: string[];
};

export type GenerateService = {
  generate(request: GenerateRequest, context: { signal: AbortSignal }): Promise<GenerateResponse>;
};

export type GenerateRouteOptions = {
  loadDisclaimer?: DisclaimerLoader;
  now?: () => Date;
  service?: GenerateService;
  timeoutMs?: number;
};

const defaultTimeoutMs = 60_000;

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Generate request timed out'));
    }, timeoutMs);

    controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
  });

  return {
    signal: controller.signal,
    clear: () => controller.abort(),
    timeoutPromise,
  };
}

async function readJson(c: Context<ApiEnv>) {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function formatErrorDetails(message: string, path?: string) {
  return [
    {
      message,
      path,
    },
  ];
}

export function registerGenerateRoutes(app: Hono<ApiEnv>, options: GenerateRouteOptions = {}) {
  app.post('/api/generate', async (c) => {
    if (options.service === undefined) {
      return c.json({ error: 'Generate service is not configured' }, 503);
    }

    const parsed = generateRequestSchema.safeParse(await readJson(c));

    if (!parsed.success) {
      return c.json(
        {
          error: 'Invalid generate request',
          details: formatValidationError(parsed.error),
        },
        400,
      );
    }

    const timeout = timeoutSignal(options.timeoutMs ?? defaultTimeoutMs);

    try {
      const result = await Promise.race([
        options.service.generate(parsed.data, {
          signal: timeout.signal,
        }),
        timeout.timeoutPromise,
      ]);
      const generatedAt = (options.now ?? (() => new Date()))().toISOString();
      const response =
        options.loadDisclaimer === undefined
          ? result
          : applyDisclaimer(result, {
              disclaimer: selectDisclaimer(await options.loadDisclaimer(), parsed.data.lang),
              generatedAt,
            });

      return c.json(response);
    } catch (error) {
      if (timeout.signal.aborted) {
        return c.json({ error: 'Generate request timed out' }, 504);
      }

      if (error instanceof WikiPageNotFoundError) {
        return c.json(
          {
            error: 'Wiki page not found',
            details: formatErrorDetails(`Wiki page not found: ${error.wikiPath}`, 'wiki_paths'),
          },
          400,
        );
      }

      if (error instanceof GeneratedOutputError) {
        return c.json(
          {
            error: 'Bad generated output',
            details: formatErrorDetails(error.message),
          },
          502,
        );
      }

      throw error;
    } finally {
      timeout.clear();
    }
  });
}
