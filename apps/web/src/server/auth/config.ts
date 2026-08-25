import { authConfiguration } from "./errors";

export interface AuthConfig {
  githubClientId: string;
  githubClientSecret: string;
  sessionSecret: string;
  appUrl: URL;
  isProduction: boolean;
}

export function getAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const githubClientId = required(environment.GITHUB_CLIENT_ID);
  const githubClientSecret = required(environment.GITHUB_CLIENT_SECRET);
  const sessionSecret = required(environment.SESSION_SECRET);
  const databaseUrl = required(environment.DATABASE_URL);
  const appUrlValue = required(environment.APP_URL);

  if (sessionSecret.length < 32 || !isDatabaseUrl(databaseUrl)) throw authConfiguration();

  let appUrl: URL;
  try {
    appUrl = new URL(appUrlValue);
  } catch {
    throw authConfiguration();
  }

  const isProduction = environment.NODE_ENV === "production";
  if (
    (appUrl.protocol !== "http:" && appUrl.protocol !== "https:") ||
    appUrl.username ||
    appUrl.password ||
    appUrl.search ||
    appUrl.hash ||
    (isProduction && appUrl.protocol !== "https:")
  ) {
    throw authConfiguration();
  }

  return {
    githubClientId,
    githubClientSecret,
    sessionSecret,
    appUrl,
    isProduction,
  };
}

function required(value: string | undefined): string {
  if (!value || value.trim().length === 0) throw authConfiguration();
  return value.trim();
}

function isDatabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  } catch {
    return false;
  }
}
