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

## Legal document bootstrap

Consent completion requires one current, published Terms of Service document and one current, published Privacy Policy document. Seed explicit document metadata after migrations; the bootstrap is idempotent for matching IDs and refuses metadata conflicts.

```bash
DATABASE_URL=postgresql://... \
LEGAL_TERMS_DOCUMENT_ID=terms-2026-01 \
LEGAL_TERMS_DOCUMENT_VERSION=2026-01 \
LEGAL_TERMS_DOCUMENT_URL=https://example.test/legal/terms/2026-01 \
LEGAL_PRIVACY_DOCUMENT_ID=privacy-2026-01 \
LEGAL_PRIVACY_DOCUMENT_VERSION=2026-01 \
LEGAL_PRIVACY_DOCUMENT_URL=https://example.test/legal/privacy/2026-01 \
pnpm db:seed:legal
```

The runtime selects the latest `published_at` document per legal document type. Do not invent document IDs or versions in a client request.

### Local development values

The web app now serves the actual Terms and Privacy pages at `/legal/terms/2026-01` and
`/legal/privacy/2026-01`. For a local `pnpm dev` run, seed with exactly these values so the served
pages match the consented document metadata:

```bash
DATABASE_URL=postgresql://... \
LEGAL_TERMS_DOCUMENT_ID=terms-2026-01 \
LEGAL_TERMS_DOCUMENT_VERSION=2026-01 \
LEGAL_TERMS_DOCUMENT_URL=http://localhost:3000/legal/terms/2026-01 \
LEGAL_PRIVACY_DOCUMENT_ID=privacy-2026-01 \
LEGAL_PRIVACY_DOCUMENT_VERSION=2026-01 \
LEGAL_PRIVACY_DOCUMENT_URL=http://localhost:3000/legal/privacy/2026-01 \
pnpm db:seed:legal
```

In production, replace `http://localhost:3000` with the deployed production origin, and have the
legal copy itself reviewed (and the TODO items on those pages resolved) before pointing a real
seed run at it.

## Runtime contract

At deploy time, the Cloudflare runtime passes Hyperdrive's connection string to the data-access layer. Use `pg` behind repositories; UI and route handlers must not contain raw database connection logic.

The schema enforces the core product invariants: OAuth account uniqueness, public Achievement requires a Skill, same-owner skill links, attachment lifecycle, quota counters, and suspension immediately removes portfolio visibility.
