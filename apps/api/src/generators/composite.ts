import type { LLMProvider } from '@apple-llm-wiki/llm';
import type { GenerateService } from '../routes/generate.js';
import { generateQuiz } from './quiz.js';
import { generateSalesScript } from './sales-script.js';
import type { WikiPageLoader } from './shared.js';
import { generateVideoScript } from './video-script.js';

export type CompositeGenerateServiceOptions = {
  llm: LLMProvider;
  loadWikiPage: WikiPageLoader;
};

export function createCompositeGenerateService(
  options: CompositeGenerateServiceOptions,
): GenerateService {
  return {
    async generate(request, context) {
      switch (request.kind) {
        case 'quiz':
          return await generateQuiz(request, context, options);
        case 'video_script':
          return await generateVideoScript(request, context, options);
        case 'sales_script':
          return await generateSalesScript(request, context, options);
      }
    },
  };
}
