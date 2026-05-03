import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PoolClient } from 'pg'
import { pool } from './db.js'

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'migrations')
const MIGRATIONS_TABLE = 'mileage_schema_migrations'

export async function runMigrations() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await ensureMigrationsTable(client)
    await baselineLegacyDatabase(client)

    const applied = await getAppliedMigrations(client)
    const migrationFiles = await listMigrationFiles()

    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/, '')
      if (applied.has(version)) continue

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
      await client.query(sql)
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (version) VALUES ($1)`,
        [version],
      )
      console.log(`Applied migration ${version}`)
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

async function ensureMigrationsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function baselineLegacyDatabase(client: PoolClient) {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM ${MIGRATIONS_TABLE}`,
  )
  if (Number(result.rows[0]?.count ?? 0) > 0) return

  if (await relationExists(client, 'public.items')) {
    await markApplied(client, '001_init')
  }

  if (await relationExists(client, 'public.item_expenses')) {
    await markApplied(client, '002_item_expenses')
  }
}

async function getAppliedMigrations(client: PoolClient) {
  const result = await client.query<{ version: string }>(
    `SELECT version FROM ${MIGRATIONS_TABLE}`,
  )
  return new Set(result.rows.map(row => row.version))
}

async function listMigrationFiles() {
  const files = await readdir(MIGRATIONS_DIR)
  return files
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort((a, b) => a.localeCompare(b))
}

async function relationExists(client: PoolClient, relation: string) {
  const result = await client.query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [relation],
  )
  return Boolean(result.rows[0]?.exists)
}

async function markApplied(client: PoolClient, version: string) {
  await client.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (version)
     VALUES ($1)
     ON CONFLICT (version) DO NOTHING`,
    [version],
  )
}
