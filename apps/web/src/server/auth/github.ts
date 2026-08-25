import { oauthExchangeFailed, oauthIdentityInvalid, oauthRequestInvalid } from "./errors";
import type { AuthConfig } from "./config";
import type { GitHubIdentity } from "./types";

export const GITHUB_OAUTH_SCOPE = "read:user user:email";
export const GITHUB_OAUTH_TIMEOUT_MS = 5_000;

type FetchImplementation = typeof fetch;

export class GitHubOAuthClient {
  constructor(
    private readonly config: AuthConfig,
    private readonly fetchImplementation: FetchImplementation = fetch,
    private readonly timeoutMs = GITHUB_OAUTH_TIMEOUT_MS,
  ) {}

  async getIdentity(code: string): Promise<GitHubIdentity> {
    if (!code.trim()) throw oauthRequestInvalid();

    const accessToken = await this.exchangeCode(code);
    const user = await this.requestJson("https://api.github.com/user", accessToken);
    const emails = await this.requestJson("https://api.github.com/user/emails", accessToken);

    return mapGitHubIdentity(user, emails);
  }

  private async exchangeCode(code: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.config.githubClientId,
      client_secret: this.config.githubClientSecret,
      code: code.trim(),
      redirect_uri: getGitHubCallbackUrl(this.config.appUrl),
    });

    const response = await this.fetchWithTimeout("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) throw oauthExchangeFailed();

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw oauthExchangeFailed();
    }

    if (!isRecord(payload) || typeof payload.access_token !== "string" || !payload.access_token) {
      throw oauthExchangeFailed();
    }

    return payload.access_token;
  }

  private async requestJson(url: string, accessToken: string): Promise<unknown> {
    const response = await this.fetchWithTimeout(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "tracefolio-web",
      },
    });

    if (!response.ok) throw oauthExchangeFailed();

    try {
      return await response.json();
    } catch {
      throw oauthExchangeFailed();
    }
  }

  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImplementation(input, { ...init, signal: controller.signal });
    } catch {
      throw oauthExchangeFailed();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getGitHubAuthorizationUrl(config: AuthConfig, state: string): URL {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.githubClientId);
  url.searchParams.set("redirect_uri", getGitHubCallbackUrl(config.appUrl));
  url.searchParams.set("scope", GITHUB_OAUTH_SCOPE);
  url.searchParams.set("state", state);
  return url;
}

export function getGitHubCallbackUrl(appUrl: URL): string {
  return new URL("/api/auth/callback/github", appUrl).toString();
}

function mapGitHubIdentity(user: unknown, emails: unknown): GitHubIdentity {
  if (!isRecord(user)) throw oauthIdentityInvalid();

  const providerAccountId = readProviderAccountId(user.id);
  const login = readBoundedString(user.login, 1, 39);
  if (!providerAccountId || !login) throw oauthIdentityInvalid();

  const emailEntries = Array.isArray(emails) ? emails.filter(isRecord) : [];
  const selectedEmail =
    emailEntries.find((entry) => entry.primary === true && entry.verified === true) ??
    emailEntries.find((entry) => entry.verified === true) ??
    emailEntries.find((entry) => entry.primary === true) ??
    emailEntries[0];
  const email = normalizeEmail(selectedEmail?.email) ?? normalizeEmail(user.email);

  return {
    providerAccountId,
    login,
    displayName: readBoundedString(user.name, 1, 160) ?? login,
    avatarUrl: readSafeAvatarUrl(user.avatar_url),
    email,
    emailVerified: selectedEmail?.verified === true,
  };
}

function readProviderAccountId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  return readBoundedString(value, 1, 128);
}

function readBoundedString(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null;
}

function normalizeEmail(value: unknown): string | null {
  const email = readBoundedString(value, 3, 320);
  return email?.includes("@") ? email : null;
}

function readSafeAvatarUrl(value: unknown): string | null {
  const avatarUrl = readBoundedString(value, 1, 2048);
  if (!avatarUrl) return null;

  try {
    const parsed = new URL(avatarUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
