export type LLMConfig = {
  apiKey?: string;
  baseURL?: string;
  model: string;
  timeoutMs: number;
};

export type LLMConfigEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  CLOUDFLARE_AI_GATEWAY_URL?: string;
  LLM_TIMEOUT_MS?: string;
};

const defaultTimeoutMs = 60_000;

function parseTimeout(value: string | undefined) {
  if (value === undefined || value.trim() === '') {
    return defaultTimeoutMs;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid LLM_TIMEOUT_MS: ${value}`);
  }

  return parsed;
}

export function resolveLLMConfig(env: LLMConfigEnv = process.env): LLMConfig {
  if (env.OPENAI_MODEL === undefined || env.OPENAI_MODEL.trim() === '') {
    throw new Error('OPENAI_MODEL is required');
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.CLOUDFLARE_AI_GATEWAY_URL ?? env.OPENAI_BASE_URL,
    model: env.OPENAI_MODEL,
    timeoutMs: parseTimeout(env.LLM_TIMEOUT_MS),
  };
}
