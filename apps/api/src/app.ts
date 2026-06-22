import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiEnv } from './env.js';
import { applyGlobalMiddleware } from './middleware/index.js';
import type { GlobalMiddlewareOptions } from './middleware/index.js';
import { type GenerateRouteOptions, registerGenerateRoutes } from './routes/generate.js';

export type ApiAppOptions = {
  generate?: GenerateRouteOptions;
  middleware?: GlobalMiddlewareOptions;
};

export function createApiApp(options: ApiAppOptions = {}) {
  const app = new Hono<ApiEnv>();

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  applyGlobalMiddleware(app, options.middleware);

  app.get('/health', (c) => c.json({ status: 'ok' }));
  registerGenerateRoutes(app, options.generate);

  return app;
}

export type ApiApp = ReturnType<typeof createApiApp>;
