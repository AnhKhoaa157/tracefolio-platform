import { createHmac } from "node:crypto";

import { DomainError } from "../domain/errors";
import type { AuthConfig } from "./config";
import type { AuthRepository, AuthUserRecord } from "./types";

export interface SessionCoreDependencies {
  repository: AuthRepository;
  config: AuthConfig;
}

export async function getAuthenticatedUserFromToken(
  rawToken: string | undefined,
  dependencies: SessionCoreDependencies,
): Promise<AuthUserRecord | null> {
  if (!rawToken || !isSessionToken(rawToken)) return null;

  return dependencies.repository.findSessionByTokenHash(
    hashSessionToken(rawToken, dependencies.config.sessionSecret),
  );
}

export async function requireAuthenticatedUserIdFromToken(
  rawToken: string | undefined,
  dependencies: SessionCoreDependencies,
): Promise<string> {
  const user = await getAuthenticatedUserFromToken(rawToken, dependencies);
  if (!user) {
    throw new DomainError("UNAUTHENTICATED", "Authentication is required.", 401);
  }

  return user.userId;
}

export async function revokeSessionFromToken(
  rawToken: string | undefined,
  dependencies: SessionCoreDependencies,
): Promise<void> {
  if (!rawToken || !isSessionToken(rawToken)) return;

  await dependencies.repository.revokeSessionByTokenHash(
    hashSessionToken(rawToken, dependencies.config.sessionSecret),
  );
}

export function hashSessionToken(rawToken: string, sessionSecret: string): string {
  return createHmac("sha256", sessionSecret).update(rawToken).digest("hex");
}

export function isSessionToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,128}$/.test(value);
}
