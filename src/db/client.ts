import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { loadEnv } from '../config/env.js';
import type { Database } from './types.js';

/**
 * Creates a Kysely client backed by a pg connection pool.
 * SQL migration files remain the source of truth for schema invariants
 * (ADR-017); Kysely is used for type-safe query building only.
 */
export function createDb(connectionString = loadEnv().DATABASE_URL): {
  db: Kysely<Database>;
  pool: pg.Pool;
} {
  const pool = new pg.Pool({ connectionString });
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
  return { db, pool };
}
