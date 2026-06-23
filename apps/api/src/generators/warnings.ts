import type { GenerateRequest } from '../routes/generate.js';

export function optionFallbackWarning(input: {
  name: string;
  reason: string;
  value: GenerateRequest['options'][string] | undefined;
}) {
  return `Option "${input.name}" was defaulted because ${JSON.stringify(input.value)} ${input.reason}`;
}
