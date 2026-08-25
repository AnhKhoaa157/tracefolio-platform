export type AuthUserStatus =
  | "ACTIVE"
  | "CONSENT_REQUIRED"
  | "PENDING_DELETION"
  | "SUSPENDED";

export interface GitHubIdentity {
  providerAccountId: string;
  login: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthUserRecord {
  userId: string;
  status: AuthUserStatus;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  onboardingComplete: boolean;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthRepository {
  findGitHubAccount(providerAccountId: string): Promise<AuthUserRecord | null>;
  createGitHubAccount(identity: GitHubIdentity, requestId: string): Promise<AuthUserRecord>;
  findSessionByTokenHash(tokenHash: string): Promise<AuthUserRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  revokeSessionByTokenHash(tokenHash: string): Promise<void>;
}
