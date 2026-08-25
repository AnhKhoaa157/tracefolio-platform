# Tracefolio database

Tracefolio uses PostgreSQL as its only product-data source of truth. Cloudflare Hyperdrive supplies the connection string to the deployed web runtime; Cloudflare R2 stores only attachment objects.

`migrations/` contains PostgreSQL-native SQL. It is intentionally not D1-compatible: JSONB, enums, row locking and PL/pgSQL triggers protect the business rules that need transactional enforcement.

## Local migration

Provide a direct PostgreSQL connection string for development or CI. Do not put a Hyperdrive binding ID or production credential in Git.

```bash
DATABASE_URL=postgresql://... pnpm db:migrate
DATABASE_URL=postgresql://... pnpm db:check
```

The runner records successfully applied files in `schema_migrations` and executes each new migration in one transaction.

## Runtime contract

At deploy time, the Cloudflare runtime passes Hyperdrive's connection string to the data-access layer. Use `pg` behind repositories; UI and route handlers must not contain raw database connection logic.

The schema enforces the core product invariants: OAuth account uniqueness, public Achievement requires a Skill, same-owner skill links, attachment lifecycle, quota counters, and suspension immediately removes portfolio visibility.
