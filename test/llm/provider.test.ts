import type { LanguageModel, LanguageModelUsage } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { createAiSdkLLMProvider } from '../../packages/llm/src/index.js';

const usage: LanguageModelUsage = {
  inputTokens: 2,
  outputTokens: 3,
  totalTokens: 5,
};

const model = {} as LanguageModel;

describe('AI SDK LLM provider', () => {
  it('generates text through the configured model and timeout', async () => {
    const generateTextImpl = vi.fn(async () => ({
      finishReason: 'stop' as const,
      text: 'generated text',
      totalUsage: usage,
      usage,
    }));
    const provider = createAiSdkLLMProvider({
      config: {
        model: 'gpt-test',
        timeoutMs: 12_000,
      },
      generateTextImpl,
      model,
    });

    await expect(
      provider.generateText({
        maxOutputTokens: 100,
        prompt: 'Write a summary.',
        system: 'Use sourced facts only.',
        temperature: 0.2,
      }),
    ).resolves.toEqual({
      finishReason: 'stop',
      text: 'generated text',
      totalUsage: usage,
      usage,
    });

    expect(generateTextImpl).toHaveBeenCalledWith({
      abortSignal: undefined,
      maxOutputTokens: 100,
      model,
      prompt: 'Write a summary.',
      system: 'Use sourced facts only.',
      temperature: 0.2,
      timeout: 12_000,
    });
  });

  it('allows per-call timeout override', async () => {
    const generateTextImpl = vi.fn(async () => ({
      finishReason: 'stop' as const,
      text: 'generated text',
      totalUsage: usage,
      usage,
    }));
    const provider = createAiSdkLLMProvider({
      config: {
        model: 'gpt-test',
        timeoutMs: 12_000,
      },
      generateTextImpl,
      model,
    });

    await provider.generateText({
      prompt: 'Write a summary.',
      timeoutMs: 5_000,
    });

    expect(generateTextImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 5_000,
      }),
    );
  });

  it('streams text through the configured model', () => {
    async function* textStream() {
      yield 'hello';
    }

    const streamTextImpl = vi.fn(() => ({
      textStream: textStream(),
    }));
    const provider = createAiSdkLLMProvider({
      config: {
        model: 'gpt-test',
        timeoutMs: 12_000,
      },
      model,
      streamTextImpl,
    });

    const result = provider.streamText({
      prompt: 'Stream this.',
    });

    expect(result.textStream).toBeDefined();
    expect(streamTextImpl).toHaveBeenCalledWith({
      abortSignal: undefined,
      maxOutputTokens: undefined,
      model,
      prompt: 'Stream this.',
      system: undefined,
      temperature: undefined,
      timeout: 12_000,
    });
  });
});
