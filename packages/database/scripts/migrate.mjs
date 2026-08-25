import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run PostgreSQL migrations.");
}

const migrationsDirectory = resolve(import.meta.dirname, "../migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
const client = new pg.Client({ connectionString });

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const filename of migrationFiles) {
    const applied = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]);

    if (applied.rowCount) continue;

    const sql = await readFile(resolve(migrationsDirectory, filename), "utf8");
    await client.query("BEGIN");

    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
