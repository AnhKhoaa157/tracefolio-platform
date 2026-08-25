import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { OAUTH_STATE_TTL_SECONDS } from "./cookies";

const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export interface OAuthStateChallenge {
  state: string;
  cookieValue: string;
  expiresAt: Date;
}

export function createOAuthState(
  sessionSecret: string,
  now = new Date(),
  createState: () => string = () => randomBytes(32).toString("base64url"),
): OAuthStateChallenge {
  const state = createState();
  const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_SECONDS * 1000);
  const digest = hashOAuthState(state, sessionSecret);

  return {
    state,
    cookieValue: `${expiresAt.getTime()}.${digest}`,
    expiresAt,
  };
}

export function validateOAuthState(
  cookieValue: string | undefined,
  state: string | undefined,
  sessionSecret: string,
  now = new Date(),
): boolean {
  if (!cookieValue || !state || !STATE_PATTERN.test(state)) return false;

  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex < 1) return false;

  const expiresAtMs = Number(cookieValue.slice(0, separatorIndex));
  const storedDigest = cookieValue.slice(separatorIndex + 1);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= now.getTime()) return false;
  if (!/^[a-f0-9]{64}$/.test(storedDigest)) return false;

  const expectedDigest = hashOAuthState(state, sessionSecret);
  return timingSafeEqual(Buffer.from(storedDigest), Buffer.from(expectedDigest));
}

export function hashOAuthState(state: string, sessionSecret: string): string {
  return createHmac("sha256", sessionSecret).update(state).digest("hex");
}
