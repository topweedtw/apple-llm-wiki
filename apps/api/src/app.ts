import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { applyGlobalMiddleware } from './middleware/index.js';

export function createApiApp() {
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  applyGlobalMiddleware(app);

  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}

export type ApiApp = ReturnType<typeof createApiApp>;
