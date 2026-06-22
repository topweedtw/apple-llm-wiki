import type { Hono } from 'hono';
import { requestLogger } from './request-logger.js';

export function applyGlobalMiddleware(app: Hono) {
  app.use('*', requestLogger());
}
