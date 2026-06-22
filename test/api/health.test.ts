import { describe, expect, it } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';

describe('GET /health', () => {
  it('returns an ok status', async () => {
    const app = createApiApp();

    const response = await app.request('/health');

    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(response.status).toBe(200);
  });
});
