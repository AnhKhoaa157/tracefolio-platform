import "server-only";

import { DomainError } from "../domain/errors";

export interface AuthenticatedUser {
  userId: string;
}

/**
 * OAuth/session integration owns this seam. Returning null is intentional until
 * a real provider-backed session is configured; no demo identity is permitted.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  return null;
}

export async function requireAuthenticatedUserId(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new DomainError("UNAUTHENTICATED", "Authentication is required.", 401);
  }

  return user.userId;
}
