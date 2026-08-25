import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "../db/client";
import type { Database, DatabaseQuery } from "../db/types";
import { authProvisioningFailed } from "./errors";
import type { AuthRepository, AuthUserRecord, CreateSessionInput, GitHubIdentity } from "./types";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "health",
  "login",
  "logout",
  "p",
  "portfolio",
  "settings",
]);

interface AuthUserRow {
  user_id: string;
  status: AuthUserRecord["status"];
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
}

interface SessionTouchRow {
  session_id: string;
  user_id: string;
}

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly database: Database = getDatabase()) {}

  async findGitHubAccount(providerAccountId: string): Promise<AuthUserRecord | null> {
    const result = await this.database.query<AuthUserRow>(
      authUserSelect(`
        EXISTS (
          SELECT 1
          FROM auth_accounts aa
          WHERE aa.user_id = u.id
            AND aa.provider = 'GITHUB'
            AND aa.provider_account_id = $1
        )
      `),
      [providerAccountId],
    );

    return result.rows[0] ? mapAuthUser(result.rows[0]) : null;
  }

  async createGitHubAccount(identity: GitHubIdentity, requestId: string): Promise<AuthUserRecord> {
    void requestId;
    return this.database.transaction(async (connection) => {
      const userId = randomUUID();
      const accountId = randomUUID();
      const username = await allocateUsername(connection, identity.login, identity.providerAccountId);
      const displayName = identity.displayName?.trim() || identity.login;

      await connection.query(
        `INSERT INTO users (id, display_name) VALUES ($1, $2)`,
        [userId, displayName],
      );
      await connection.query(
        `
          INSERT INTO auth_accounts (
            id, user_id, provider, provider_account_id, provider_email, provider_email_verified_at
          )
          VALUES ($1, $2, 'GITHUB', $3, $4, $5)
        `,
        [
          accountId,
          userId,
          identity.providerAccountId,
          identity.email,
          identity.emailVerified ? new Date() : null,
        ],
      );
      await connection.query(
        `
          INSERT INTO profiles (user_id, username, username_normalized, avatar_url)
          VALUES ($1, $2, $3, $4)
        `,
        [userId, username.displayName, username.normalized, identity.avatarUrl],
      );
      await connection.query(
        `INSERT INTO portfolio_settings (user_id, is_public) VALUES ($1, false)`,
        [userId],
      );
      await connection.query(
        `INSERT INTO user_usage (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );

      const result = await connection.query<AuthUserRow>(authUserSelect("u.id = $1"), [userId]);
      if (!result.rows[0]) throw authProvisioningFailed();
      return mapAuthUser(result.rows[0]);
    });
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AuthUserRecord | null> {
    const touched = await this.database.query<SessionTouchRow>(
      `
        UPDATE sessions s
        SET last_seen_at = now()
        FROM users u
        WHERE s.user_id = u.id
          AND s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.status IN ('ACTIVE', 'CONSENT_REQUIRED')
        RETURNING s.id AS session_id, s.user_id
      `,
      [tokenHash],
    );
    const session = touched.rows[0];
    if (!session) return null;

    const result = await this.database.query<AuthUserRow>(authUserSelect("u.id = $1"), [session.user_id]);
    return result.rows[0] ? mapAuthUser(result.rows[0]) : null;
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.database.query(
      `
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [randomUUID(), input.userId, input.tokenHash, input.expiresAt],
    );
  }

  async revokeSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.database.query(
      `
        UPDATE sessions
        SET revoked_at = COALESCE(revoked_at, now())
        WHERE token_hash = $1
      `,
      [tokenHash],
    );
  }
}

export function getAuthRepository(): AuthRepository {
  return new PostgresAuthRepository(getDatabase());
}

function authUserSelect(where: string): string {
  return `
    SELECT
      u.id AS user_id,
      u.status,
      COALESCE(NULLIF(BTRIM(u.display_name), ''), NULLIF(BTRIM(p.username), ''), 'Tracefolio user') AS display_name,
      p.username,
      p.avatar_url,
      -- The existing MVP schema has no onboarding flag; these required profile fields are its durable completion signal.
      (
        p.username IS NOT NULL
        AND NULLIF(BTRIM(p.headline), '') IS NOT NULL
        AND NULLIF(BTRIM(p.bio), '') IS NOT NULL
      ) AS onboarding_complete
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE ${where}
  `;
}

function mapAuthUser(row: AuthUserRow): AuthUserRecord {
  return {
    userId: row.user_id,
    status: row.status,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    onboardingComplete: row.onboarding_complete,
  };
}

async function allocateUsername(
  connection: DatabaseQuery,
  login: string,
  providerAccountId: string,
): Promise<{ displayName: string; normalized: string }> {
  const base = profileUsernameBase(login, providerAccountId);
  const suffixBase = providerAccountId.replace(/[^a-z0-9]/gi, "").toLowerCase() || "user";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${suffixBase.slice(0, 8)}${attempt > 1 ? `-${attempt}` : ""}`;
    const candidate = fitUsernameWithSuffix(base, suffix);
    const result = await connection.query(
      `
        SELECT 1
        FROM profiles
        WHERE username_normalized = $1
        UNION ALL
        SELECT 1
        FROM username_aliases
        WHERE username_normalized = $1 AND expires_at > now()
        LIMIT 1
      `,
      [candidate],
    );

    if (!result.rows[0]) return { displayName: candidate, normalized: candidate };
  }

  throw authProvisioningFailed();
}

function profileUsernameBase(login: string, providerAccountId: string): string {
  const normalized = login
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  if (normalized.length >= 3 && !RESERVED_USERNAMES.has(normalized)) return fitUsername(normalized);

  const id = providerAccountId.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return fitUsername(`gh-${id || "user"}`);
}

function fitUsername(value: string): string {
  const trimmed = value.slice(0, 32).replace(/[^a-z0-9]+$/g, "");
  if (trimmed.length >= 3) return trimmed;
  return `gh-${trimmed || "user"}`.slice(0, 32);
}

function fitUsernameWithSuffix(base: string, suffix: string): string {
  const availableBaseLength = Math.max(1, 32 - suffix.length);
  const trimmedBase = base.slice(0, availableBaseLength).replace(/[^a-z0-9]+$/g, "");
  return fitUsername(`${trimmedBase}${suffix}`);
}
