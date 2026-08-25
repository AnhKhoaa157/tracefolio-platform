import { strict as assert } from "node:assert";
import test from "node:test";

import { NextRequest } from "next/server";

import { GET as getAuthCallback } from "@/app/api/auth/callback/github/route";

import { createOAuthState } from "./state";

const environmentKeys = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "SESSION_SECRET",
  "APP_URL",
  "DATABASE_URL",
  "NODE_ENV",
] as const;
const sessionSecret = "test-session-secret-01234567890123456789";

test("GitHub callback rejects an invalid OAuth state", async () => {
  await withAuthEnvironment(async () => {
    const validChallenge = createOAuthState(sessionSecret, new Date("2026-08-25T00:00:00.000Z"), () => "a".repeat(43));
    const request = new NextRequest(
      `http://localhost/api/auth/callback/github?state=${"b".repeat(43)}&code=oauth-code`,
      { headers: { cookie: `tracefolio_oauth_state=${validChallenge.cookieValue}` } },
    );

    const response = await getAuthCallback(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, "OAUTH_STATE_INVALID");
  });
});

test("GitHub callback rejects an expired OAuth state", async () => {
  await withAuthEnvironment(async () => {
    const expiredChallenge = createOAuthState(
      sessionSecret,
      new Date("2026-08-25T00:00:00.000Z"),
      () => "a".repeat(43),
    );
    const request = new NextRequest(
      `http://localhost/api/auth/callback/github?state=${expiredChallenge.state}&code=oauth-code`,
      { headers: { cookie: `tracefolio_oauth_state=${expiredChallenge.cookieValue}` } },
    );

    const response = await getAuthCallback(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, "OAUTH_STATE_INVALID");
  });
});

async function withAuthEnvironment(callback: () => Promise<void>): Promise<void> {
  const original = new Map(environmentKeys.map((key) => [key, process.env[key]]));
  process.env.GITHUB_CLIENT_ID = "test-client-id";
  process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
  process.env.SESSION_SECRET = sessionSecret;
  process.env.APP_URL = "http://localhost:3000";
  process.env.DATABASE_URL = "postgresql://test.invalid/tracefolio";
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  try {
    await callback();
  } finally {
    for (const key of environmentKeys) {
      const value = original.get(key);
      if (value === undefined) delete process.env[key];
      else (process.env as Record<string, string | undefined>)[key] = value;
    }
  }
}
