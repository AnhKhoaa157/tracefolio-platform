export const achievementStatuses = [
  "DRAFT",
  "PRIVATE",
  "PUBLIC",
  "ARCHIVED",
] as const;

export type AchievementStatus = (typeof achievementStatuses)[number];

export interface ProfileLink {
  label: string;
  url: string;
}

export interface Profile {
  userId: string;
  username: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  links: ProfileLink[];
}

export interface PublicProfile {
  username: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  links: ProfileLink[];
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  description: string | null;
}

export interface PublicSkill {
  name: string;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  summary: string;
  context: string | null;
  contribution: string | null;
  impact: string | null;
  occurredAt: string | null;
  status: AchievementStatus;
  publishedAt: string | null;
  skills: Skill[];
}

export interface PublicAchievement {
  id: string;
  title: string;
  summary: string;
  context: string | null;
  contribution: string | null;
  impact: string | null;
  occurredAt: string | null;
  publishedAt: string;
  skills: PublicSkill[];
}

export interface PublicPortfolio {
  profile: PublicProfile;
  achievements: PublicAchievement[];
}

export interface CreateProfileRequest {
  username: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  links?: ProfileLink[];
}

export interface UpdateProfileRequest {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  links?: ProfileLink[];
}

export interface ChangeUsernameRequest {
  username: string;
}

export interface CreateSkillRequest {
  name: string;
  description?: string | null;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string | null;
}

export interface CreateAchievementRequest {
  title: string;
  summary: string;
  context?: string | null;
  contribution?: string | null;
  impact?: string | null;
  occurredAt?: string | null;
}

export interface UpdateAchievementRequest {
  title?: string;
  summary?: string;
  context?: string | null;
  contribution?: string | null;
  impact?: string | null;
  occurredAt?: string | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  request_id: string;
}
