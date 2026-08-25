import type { ProfileLink } from "@/contracts/portfolio";

import { invalidInput } from "./errors";

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

export function requireUserId(value: unknown): string {
  return requireIdentifier(value, "user id");
}

export function requireIdentifier(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 128) {
    throw invalidInput(`A valid ${field} is required.`);
  }

  return value.trim();
}

export function normalizeUsername(value: unknown): {
  username: string;
  usernameNormalized: string;
} {
  if (typeof value !== "string") throw invalidInput("Username must be a string.");

  const username = value.trim();
  const usernameNormalized = username.toLowerCase();

  if (
    usernameNormalized.length < 3 ||
    usernameNormalized.length > 32 ||
    !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(usernameNormalized)
  ) {
    throw invalidInput("Username must be 3-32 characters using letters, numbers, ., _ or -.");
  }

  if (RESERVED_USERNAMES.has(usernameNormalized)) {
    throw invalidInput("That username is reserved.");
  }

  return { username, usernameNormalized };
}

export function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw invalidInput(`${field} must be a string.`);

  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw invalidInput(`${field} must contain 1-${maxLength} characters.`);
  }

  return normalized;
}

export function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw invalidInput(`${field} must be a string or null.`);

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw invalidInput(`${field} must contain at most ${maxLength} characters.`);
  }

  return normalized || null;
}

export function normalizeLinks(value: unknown): ProfileLink[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 10) {
    throw invalidInput("Links must be an array with at most 10 items.");
  }

  return value.map((link, index) => {
    if (!isRecord(link)) throw invalidInput(`Link ${index + 1} must be an object.`);

    const label = requireText(link.label, `Link ${index + 1} label`, 80);
    const url = requireText(link.url, `Link ${index + 1} URL`, 2048);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw invalidInput(`Link ${index + 1} URL is invalid.`);
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw invalidInput(`Link ${index + 1} URL must use HTTP or HTTPS.`);
    }

    return { label, url };
  });
}

export function normalizeOccurredAt(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw invalidInput("occurredAt must be an ISO date or null.");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw invalidInput("occurredAt must be a valid date.");

  return date;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
