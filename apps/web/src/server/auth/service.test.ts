import { strict as assert } from "node:assert";
import test from "node:test";

import { hashSessionToken } from "./session-core";
import { AuthService } from "./service";
import type { AuthConfig } from "./config";
import type { AuthRepository, AuthUserRecord, CreateSessionInput, GitHubIdentity } from "./types";

const config: AuthConfig = {
  githubClientId: "client-id",
  githubClientSecret: "client-secret",
  sessionSecret: "test-session-secret-01234567890123456789",
  appUrl: new URL("http://localhost:3000"),
  isProduction: false,
};
const identity: GitHubIdentity = {
  providerAccountId: "12345",
  login: "github-user",
  displayName: "GitHub User",
  avatarUrl: "https://avatars.githubusercontent.com/u/12345",
  email: "user@example.com",
  emailVerified: true,
};
const existingUser = makeUser({ userId: "existing-user", onboardingComplete: true });
const createdUser = makeUser({ userId: "new-user", onboardingComplete: false });

test("new GitHub identities create an account and persist only a session hash", async () => {
  let created = false;
  let session: CreateSessionInput | undefined;
  const repository = fakeRepository({
    findGitHubAccount: async () => null,
    createGitHubAccount: async () => {
      created = true;
      return createdUser;
    },
    createSession: async (input) => {
      session = input;
    },
  });
  const rawToken = "new-session-token-012345678901234567890123456";
  const service = new AuthService({
    config,
    repository,
    githubClient: { getIdentity: async () => identity },
    now: () => new Date("2026-08-25T00:00:00.000Z"),
    createSessionToken: () => rawToken,
  });

  const result = await service.signInWithGitHubCode("oauth-code", "request-1");

  assert.equal(created, true);
  assert.equal(result.isNewAccount, true);
  assert.equal(result.user.userId, createdUser.userId);
  assert.equal(session?.userId, createdUser.userId);
  assert.equal(session?.tokenHash, hashSessionToken(rawToken, config.sessionSecret));
  assert.notEqual(session?.tokenHash, rawToken);
});

test("existing GitHub identities sign in without creating another account", async () => {
  let createCalled = false;
  let session: CreateSessionInput | undefined;
  const repository = fakeRepository({
    findGitHubAccount: async () => existingUser,
    createGitHubAccount: async () => {
      createCalled = true;
      return createdUser;
    },
    createSession: async (input) => {
      session = input;
    },
  });
  const service = new AuthService({
    config,
    repository,
    githubClient: { getIdentity: async () => identity },
    createSessionToken: () => "existing-session-token-0123456789012345678",
  });

  const result = await service.signInWithGitHubCode("oauth-code", "request-2");

  assert.equal(createCalled, false);
  assert.equal(result.isNewAccount, false);
  assert.equal(result.user.userId, existingUser.userId);
  assert.equal(session?.userId, existingUser.userId);
});

function makeUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    userId: "user-1",
    status: "ACTIVE",
    displayName: "GitHub User",
    username: "github-user",
    avatarUrl: null,
    onboardingComplete: false,
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  const defaults: AuthRepository = {
    findGitHubAccount: async () => null,
    createGitHubAccount: async () => createdUser,
    findSessionByTokenHash: async () => null,
    createSession: async () => undefined,
    revokeSessionByTokenHash: async () => undefined,
  };

  return { ...defaults, ...overrides };
}
