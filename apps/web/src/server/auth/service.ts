import { randomBytes } from "node:crypto";

import { DatabaseFailure } from "../db/errors";
import { SESSION_TTL_SECONDS } from "./cookies";
import { authAccountUnavailable, authProvisioningFailed } from "./errors";
import type { AuthConfig } from "./config";
import { GitHubOAuthClient } from "./github";
import { hashSessionToken } from "./session-core";
import type { AuthRepository, AuthUserRecord } from "./types";

export interface GitHubSignInResult {
  rawSessionToken: string;
  expiresAt: Date;
  user: AuthUserRecord;
  isNewAccount: boolean;
}

export interface AuthServiceDependencies {
  config: AuthConfig;
  repository: AuthRepository;
  githubClient: Pick<GitHubOAuthClient, "getIdentity">;
  now?: () => Date;
  createSessionToken?: () => string;
}

export class AuthService {
  private readonly now: () => Date;
  private readonly createSessionToken: () => string;

  constructor(private readonly dependencies: AuthServiceDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.createSessionToken =
      dependencies.createSessionToken ?? (() => randomBytes(32).toString("base64url"));
  }

  async signInWithGitHubCode(code: string, requestId: string): Promise<GitHubSignInResult> {
    const identity = await this.dependencies.githubClient.getIdentity(code);
    let user = await this.dependencies.repository.findGitHubAccount(identity.providerAccountId);
    let isNewAccount = false;

    if (!user) {
      try {
        user = await this.dependencies.repository.createGitHubAccount(identity, requestId);
        isNewAccount = true;
      } catch (error) {
        if (!(error instanceof DatabaseFailure) || error.code !== "DATABASE_CONSTRAINT") {
          throw error;
        }

        user = await this.dependencies.repository.findGitHubAccount(identity.providerAccountId);
        if (!user) throw authProvisioningFailed();
      }
    }

    if (user.status !== "ACTIVE" && user.status !== "CONSENT_REQUIRED") {
      throw authAccountUnavailable();
    }

    const rawSessionToken = this.createSessionToken();
    const expiresAt = new Date(this.now().getTime() + SESSION_TTL_SECONDS * 1000);
    await this.dependencies.repository.createSession({
      userId: user.userId,
      tokenHash: hashSessionToken(rawSessionToken, this.dependencies.config.sessionSecret),
      expiresAt,
    });

    return { rawSessionToken, expiresAt, user, isNewAccount };
  }
}
