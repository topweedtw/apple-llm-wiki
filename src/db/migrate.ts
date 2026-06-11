import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from '../config/env.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Thin SQL migration runner (ADR-017). Applies checked-in *.sql files in
 * filename order inside a transaction, recording applied versions in
 * schema_migrations. Already-applied migrations are skipped, so the command
 * is safe to re-run.
 */
export async function migrate(connectionString = loadEnv().DATABASE_URL): Promise<string[]> {
  const pool = new pg.Pool({ connectionString });
  const applied: string[] = [];
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();

    const done = new Set(
      (await pool.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map(
        (row) => row.version,
      ),
    );

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (done.has(version)) {
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        applied.push(version);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${version} failed: ${(error as Error).message}`);
      } finally {
        client.release();
      }
    }
    return applied;
  } finally {
    await pool.end();
  }
}

// Run when invoked directly via `pnpm db:migrate`.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then((applied) => {
      if (applied.length === 0) {
        console.log('No pending migrations. Database is up to date.');
      } else {
        console.log(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
