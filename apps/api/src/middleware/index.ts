import type { Hono } from 'hono';
import type { ApiEnv } from '../env.js';
import { type AuthMiddlewareOptions, authMiddleware } from './auth.js';
import { requestLogger } from './request-logger.js';

export type GlobalMiddlewareOptions = {
  auth?: AuthMiddlewareOptions | false;
};

export function applyGlobalMiddleware(app: Hono<ApiEnv>, options: GlobalMiddlewareOptions = {}) {
  app.use('*', requestLogger());
  app.use('*', authMiddleware(options.auth === false ? undefined : options.auth));
}
