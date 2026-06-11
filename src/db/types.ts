import type { ColumnType } from 'kysely';

/**
 * Kysely database interface. This grows as canonical tables are added in
 * Phase 1. For Phase 0 it only models the migration bookkeeping table.
 */
export interface SchemaMigrationsTable {
  version: string;
  applied_at: ColumnType<Date, Date | string | undefined, never>;
}

export interface Database {
  schema_migrations: SchemaMigrationsTable;
}
