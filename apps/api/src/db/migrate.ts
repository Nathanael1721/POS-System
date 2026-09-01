import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, closeDb } from './client.js';
import { logger } from '../config/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Minimal forward-only migration runner.
 * Applies every *.sql file in lexical order exactly once, tracked in
 * the schema_migrations table. Each file runs inside its own transaction.
 */
async function ensureMigrationsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await sql<{ filename: string }[]>`SELECT filename FROM schema_migrations`;
  return new Set(rows.map((r) => r.filename));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      logger.debug({ file }, 'migration already applied, skipping');
      continue;
    }
    const text = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    logger.info({ file }, 'applying migration');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations (filename) VALUES (${file})`;
    });
    count += 1;
  }

  logger.info({ applied: count, total: files.length }, 'migrations complete');
}

run()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error({ err }, 'migration failed');
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
