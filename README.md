# Tracefolio Platform

Tracefolio turns real work into structured achievements, skill evidence, and shareable portfolios.

The repository is a pnpm monorepo with a Next.js web app, an isolated agent worker, shared agent contracts, and a local DeepSeek Harness checkout. Claude Code and Codex compatibility belongs in the worker/plugin layer; the product web app remains independent from the agent runtime.

The production persistence decision is PostgreSQL hosted outside Cloudflare and accessed from the Cloudflare web runtime through Hyperdrive. Cloudflare R2 is reserved for attachment objects. `packages/database` contains the PostgreSQL-native migration contract; D1 is not in the product data path.

## Repository layout

```text
apps/web/                  Next.js product application
apps/agent-worker/         Isolated agent runtime entry point
packages/agent-contracts/  Provider-neutral agent contracts
packages/database/         PostgreSQL migrations and data-access boundary
vendor/deepseek-harness/   Local, ignored upstream Harness checkout
```

## Local setup

Requirements: Node 24+, pnpm 11+.

```bash
pnpm install
pnpm dev:web
```

The agent worker can be started separately:

```bash
pnpm dev:agent
```

## Local AI loop

The agent worker resolves a requested local skill from `.agents/skills` (Codex) or `.claude/skills` (Claude Code), adds Tracefolio's product guardrails, and can call DeepSeek Harness headless. These three local directories are intentionally ignored by Git.

Start the worker with `pnpm dev:agent`, then send a `POST /v1/agent-runs` request. `preview` is the default and verifies the skill-to-prompt path without invoking a model. An actual Harness call requires `TRACEFOLIO_HARNESS_EXECUTION_ENABLED=true`, a built Harness checkout, and a configured provider profile.

## License

Tracefolio code is currently private project code. `vendor/deepseek-harness/` remains under its upstream MIT License; see [docs/UPSTREAM_HARNESS.md](docs/UPSTREAM_HARNESS.md) and the vendored `LICENSE`/`THIRD_PARTY_NOTICES.md` files before redistribution.
