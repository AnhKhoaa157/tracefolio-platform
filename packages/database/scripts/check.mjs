import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to check PostgreSQL migrations.");
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const { rows } = await client.query("SELECT filename FROM schema_migrations ORDER BY filename");
  console.log(`Connected to PostgreSQL. Applied migrations: ${rows.map((row) => row.filename).join(", ") || "none"}`);
} finally {
  await client.end();
}
