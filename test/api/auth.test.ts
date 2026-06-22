import { describe, expect, it } from 'vitest';
import { createApiApp } from '../../apps/api/src/app.js';

const authEnv = {
  AUTH0_ISSUER: 'https://example.auth0.com/',
  AUTH0_AUDIENCE: 'https://api.example.test',
};

function createProtectedApp() {
  const app = createApiApp({
    middleware: {
      auth: {
        verifyToken: async (token) => {
          if (token !== 'valid-token') {
            throw new Error('invalid token');
          }

          return { sub: 'user_123' };
        },
      },
    },
  });

  app.get('/protected', (c) => c.json({ subject: c.get('auth').sub }));

  return app;
}

describe('Auth0 JWT middleware', () => {
  it('keeps /health public', async () => {
    const app = createProtectedApp();

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('rejects requests without a bearer token', async () => {
    const app = createProtectedApp();

    const response = await app.request('/protected', {}, authEnv);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('rejects requests with an invalid bearer token', async () => {
    const app = createProtectedApp();

    const response = await app.request(
      '/protected',
      {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      },
      authEnv,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('allows requests with a valid bearer token', async () => {
    const app = createProtectedApp();

    const response = await app.request(
      '/protected',
      {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      },
      authEnv,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ subject: 'user_123' });
  });
});
