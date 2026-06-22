import { createOpenAI } from '@ai-sdk/openai';
import {
  type FinishReason,
  type LanguageModel,
  type LanguageModelUsage,
  generateText as aiGenerateText,
  streamText as aiStreamText,
} from 'ai';
import { type LLMConfig, resolveLLMConfig } from './config.js';

export type LLMRequest = {
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
};

export type LLMGenerateResult = {
  text: string;
  finishReason: FinishReason;
  usage: LanguageModelUsage;
  totalUsage: LanguageModelUsage;
};

export type LLMStreamResult = {
  textStream: AsyncIterable<string>;
};

export type LLMProvider = {
  generateText(request: LLMRequest): Promise<LLMGenerateResult>;
  streamText(request: LLMRequest): LLMStreamResult;
};

type GenerateTextImpl = typeof aiGenerateText;
type StreamTextImpl = typeof aiStreamText;

export type AiSdkLLMProviderOptions = {
  config?: LLMConfig;
  generateTextImpl?: GenerateTextImpl;
  streamTextImpl?: StreamTextImpl;
  model?: LanguageModel;
};

function createOpenAIModel(config: LLMConfig): LanguageModel {
  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return openai(config.model);
}

export function createAiSdkLLMProvider(options: AiSdkLLMProviderOptions = {}): LLMProvider {
  const config = options.config ?? resolveLLMConfig();
  const model = options.model ?? createOpenAIModel(config);
  const generateTextImpl = options.generateTextImpl ?? aiGenerateText;
  const streamTextImpl = options.streamTextImpl ?? aiStreamText;

  return {
    async generateText(request) {
      const result = await generateTextImpl({
        abortSignal: request.abortSignal,
        maxOutputTokens: request.maxOutputTokens,
        model,
        prompt: request.prompt,
        system: request.system,
        temperature: request.temperature,
        timeout: request.timeoutMs ?? config.timeoutMs,
      });

      return {
        finishReason: result.finishReason,
        text: result.text,
        totalUsage: result.totalUsage,
        usage: result.usage,
      };
    },
    streamText(request) {
      const result = streamTextImpl({
        abortSignal: request.abortSignal,
        maxOutputTokens: request.maxOutputTokens,
        model,
        prompt: request.prompt,
        system: request.system,
        temperature: request.temperature,
        timeout: request.timeoutMs ?? config.timeoutMs,
      });

      return {
        textStream: result.textStream,
      };
    },
  };
}
