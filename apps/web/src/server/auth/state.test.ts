import { strict as assert } from "node:assert";
import test from "node:test";

import {
  getAuthCookieOptions,
  OAUTH_STATE_TTL_SECONDS,
} from "./cookies";
import { createOAuthState, validateOAuthState } from "./state";

const sessionSecret = "test-session-secret-01234567890123456789";

test("OAuth state is HMAC-bound and expires", () => {
  const now = new Date("2026-08-25T00:00:00.000Z");
  const challenge = createOAuthState(sessionSecret, now, () => "a".repeat(43));

  assert.equal(validateOAuthState(challenge.cookieValue, challenge.state, sessionSecret, now), true);
  assert.equal(validateOAuthState(challenge.cookieValue, "b".repeat(43), sessionSecret, now), false);
  assert.equal(
    validateOAuthState(
      challenge.cookieValue,
      challenge.state,
      sessionSecret,
      new Date(now.getTime() + OAUTH_STATE_TTL_SECONDS * 1000),
    ),
    false,
  );
});

test("auth cookies use the required security options", () => {
  const expiresAt = new Date("2026-08-25T00:10:00.000Z");
  const options = getAuthCookieOptions(expiresAt, 600, true);

  assert.deepEqual(options, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,
    expires: expiresAt,
    maxAge: 600,
  });
});
