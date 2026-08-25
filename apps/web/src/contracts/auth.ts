export interface AuthSessionUser {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface AuthSessionResponse {
  user: AuthSessionUser;
  onboardingComplete: boolean;
}
