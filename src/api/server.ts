import Fastify, { type FastifyInstance } from 'fastify';
import { loadEnv } from '../config/env.js';
import { healthRoutes } from './routes/health.js';

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  return app;
}

// Start the server when invoked directly via `pnpm dev`.
if (import.meta.url === `file://${process.argv[1]}`) {
  const env = loadEnv();
  const app = buildServer();
  app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
