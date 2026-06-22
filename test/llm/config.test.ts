import { describe, expect, it } from 'vitest';
import { resolveLLMConfig } from '../../packages/llm/src/index.js';

describe('LLM config', () => {
  it('resolves model, gateway base URL, API key, and timeout from env', () => {
    expect(
      resolveLLMConfig({
        CLOUDFLARE_AI_GATEWAY_URL: 'https://gateway.ai.cloudflare.com/v1/account/gateway/openai',
        LLM_TIMEOUT_MS: '45000',
        OPENAI_API_KEY: 'test-key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        OPENAI_MODEL: 'gpt-test',
      }),
    ).toEqual({
      apiKey: 'test-key',
      baseURL: 'https://gateway.ai.cloudflare.com/v1/account/gateway/openai',
      model: 'gpt-test',
      timeoutMs: 45_000,
    });
  });

  it('falls back to OpenAI base URL when AI Gateway URL is absent', () => {
    expect(
      resolveLLMConfig({
        OPENAI_BASE_URL: 'https://proxy.example/v1',
        OPENAI_MODEL: 'gpt-test',
      }).baseURL,
    ).toBe('https://proxy.example/v1');
  });

  it('requires a configured model', () => {
    expect(() => resolveLLMConfig({})).toThrow(/OPENAI_MODEL is required/);
  });

  it('rejects invalid timeout values', () => {
    expect(() =>
      resolveLLMConfig({
        LLM_TIMEOUT_MS: '0',
        OPENAI_MODEL: 'gpt-test',
      }),
    ).toThrow(/Invalid LLM_TIMEOUT_MS/);
  });
});
