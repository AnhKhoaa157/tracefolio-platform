import { strict as assert } from "node:assert";
import test from "node:test";

import { getAuthConfig } from "./config";
import { AuthFailure } from "./errors";

const validEnvironment: NodeJS.ProcessEnv = {
  GITHUB_CLIENT_ID: "client-id",
  GITHUB_CLIENT_SECRET: "client-secret",
  SESSION_SECRET: "test-session-secret-01234567890123456789",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://test.invalid/tracefolio",
  NODE_ENV: "test",
};

test("auth configuration fails closed when required values are missing or unsafe", () => {
  assert.throws(
    () => getAuthConfig({ ...validEnvironment, SESSION_SECRET: "too-short" }),
    (error: unknown) => error instanceof AuthFailure && error.code === "AUTH_CONFIGURATION",
  );
  assert.throws(
    () => getAuthConfig({ ...validEnvironment, APP_URL: "http://user:password@example.test" }),
    (error: unknown) => error instanceof AuthFailure && error.code === "AUTH_CONFIGURATION",
  );
  assert.throws(
    () => getAuthConfig({ ...validEnvironment, DATABASE_URL: undefined }),
    (error: unknown) => error instanceof AuthFailure && error.code === "AUTH_CONFIGURATION",
  );
  assert.throws(
    () => getAuthConfig({ ...validEnvironment, DATABASE_URL: "not-a-database-url" }),
    (error: unknown) => error instanceof AuthFailure && error.code === "AUTH_CONFIGURATION",
  );
});
