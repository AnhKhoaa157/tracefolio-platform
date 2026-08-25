import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { DomainError } from "../domain/errors";
import { getAuthConfig } from "./config";
import { clearAuthCookie, SESSION_COOKIE_NAME } from "./cookies";
import {
  getAuthenticatedUserFromToken,
  isSessionToken,
  revokeSessionFromToken,
} from "./session-core";
import type { SessionCoreDependencies } from "./session-core";
import type { AuthConfig } from "./config";
import type { AuthRepository, AuthUserRecord } from "./types";

export type AuthenticatedUser = AuthUserRecord;

export interface SessionDependencies {
  repository?: AuthRepository;
  config?: AuthConfig;
}

export async function getAuthenticatedUser(
  request?: Request,
  dependencies: SessionDependencies = {},
): Promise<AuthenticatedUser | null> {
  const rawToken = await readSessionCookie(request);
  if (!rawToken || !isSessionToken(rawToken)) return null;

  return getAuthenticatedUserFromToken(rawToken, await resolveDependencies(dependencies));
}

export async function requireAuthenticatedUserId(
  request?: Request,
  dependencies: SessionDependencies = {},
): Promise<string> {
  const user = await getAuthenticatedUser(request, dependencies);
  if (!user) {
    throw new DomainError("UNAUTHENTICATED", "Authentication is required.", 401);
  }

  return user.userId;
}

export async function revokeCurrentSession(
  request: Request,
  dependencies: SessionDependencies = {},
): Promise<void> {
  const rawToken = await readSessionCookie(request);
  if (!rawToken || !isSessionToken(rawToken)) return;

  await revokeSessionFromToken(rawToken, await resolveDependencies(dependencies));
}

export { hashSessionToken } from "./session-core";

export function clearSessionCookie(response: NextResponse, isProduction: boolean): void {
  clearAuthCookie(response, SESSION_COOKIE_NAME, isProduction);
}

async function resolveDependencies(dependencies: SessionDependencies): Promise<SessionCoreDependencies> {
  const config = dependencies.config ?? getAuthConfig();
  const repository = dependencies.repository ?? (await import("./repository")).getAuthRepository();
  return { config, repository };
}

async function readSessionCookie(request?: Request): Promise<string | undefined> {
  if (request) return readCookieHeader(request.headers.get("cookie"), SESSION_COOKIE_NAME);

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

function readCookieHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;

  for (const segment of header.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0) continue;

    const key = segment.slice(0, separator).trim();
    if (key !== name) continue;

    const value = segment.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}
