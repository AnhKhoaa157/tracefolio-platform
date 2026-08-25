import { strict as assert } from "node:assert";
import test from "node:test";

import { DomainError } from "../domain/errors";
import {
  getAuthenticatedUserFromToken,
  hashSessionToken,
  requireAuthenticatedUserIdFromToken,
  revokeSessionFromToken,
} from "./session-core";
import type { AuthConfig } from "./config";
import type { AuthRepository, AuthUserRecord } from "./types";

const config: AuthConfig = {
  githubClientId: "client-id",
  githubClientSecret: "client-secret",
  sessionSecret: "test-session-secret-01234567890123456789",
  appUrl: new URL("http://localhost:3000"),
  isProduction: false,
};
const rawToken = "session-token-012345678901234567890123456789";
const user = makeUser();

test("session lookup hashes the raw cookie token and returns only the stored user", async () => {
  let receivedHash = "";
  const repository = fakeRepository({
    findSessionByTokenHash: async (tokenHash) => {
      receivedHash = tokenHash;
      return user;
    },
  });

  const result = await getAuthenticatedUserFromToken(rawToken, { repository, config });

  assert.deepEqual(result, user);
  assert.equal(receivedHash, hashSessionToken(rawToken, config.sessionSecret));
  assert.notEqual(receivedHash, rawToken);
});

test("a missing session fails closed for protected requests", async () => {
  const repository = fakeRepository();

  await assert.rejects(
    requireAuthenticatedUserIdFromToken(undefined, { repository, config }),
    (error: unknown) => error instanceof DomainError && error.code === "UNAUTHENTICATED",
  );
});

test("logout revokes the HMAC identified by the raw session cookie", async () => {
  let revokedHash = "";
  const repository = fakeRepository({
    revokeSessionByTokenHash: async (tokenHash) => {
      revokedHash = tokenHash;
    },
  });

  await revokeSessionFromToken(rawToken, { repository, config });

  assert.equal(revokedHash, hashSessionToken(rawToken, config.sessionSecret));
});

function makeUser(): AuthUserRecord {
  return {
    userId: "user-1",
    status: "ACTIVE",
    displayName: "Tracefolio User",
    username: "tracefolio-user",
    avatarUrl: "https://avatars.githubusercontent.com/u/1",
    onboardingComplete: true,
  };
}

function fakeRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  const defaults: AuthRepository = {
    findGitHubAccount: async () => null,
    createGitHubAccount: async () => user,
    findSessionByTokenHash: async () => null,
    createSession: async () => undefined,
    revokeSessionByTokenHash: async () => undefined,
  };

  return { ...defaults, ...overrides };
}
