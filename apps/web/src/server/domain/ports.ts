import type {
  Achievement,
  AchievementStatus,
  Profile,
  ProfileLink,
  PortfolioSettings,
  PublicSkill,
  Skill,
} from "@/contracts/portfolio";

export type UserStatus = "ACTIVE" | "CONSENT_REQUIRED" | "PENDING_DELETION" | "SUSPENDED";

export interface ProfileFields {
  username: string;
  usernameNormalized: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  links: ProfileLink[];
}

export interface ProfileUpdateFields {
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  links: ProfileLink[];
}

export interface SkillFields {
  name: string;
  nameNormalized: string;
  description: string | null;
}

export interface SkillUpdateFields {
  name: string;
  nameNormalized: string;
  description: string | null;
}

export interface AchievementFields {
  title: string;
  summary: string;
  context: string | null;
  contribution: string | null;
  impact: string | null;
  occurredAt: Date | null;
}

export interface PublicAchievementCandidate {
  id: string;
  userId: string;
  title: string;
  summary: string;
  context: string | null;
  contribution: string | null;
  impact: string | null;
  occurredAt: string | null;
  publishedAt: string | null;
  status: AchievementStatus;
  skills: PublicSkill[];
}

export interface PublicPortfolioCandidate {
  profile: Profile;
  userStatus: UserStatus;
  isPortfolioPublic: boolean;
  achievements: PublicAchievementCandidate[];
}

export interface TracefolioRepository {
  assertUserCanWrite(userId: string): Promise<void>;

  getProfileByUserId(userId: string): Promise<Profile | null>;
  createProfile(userId: string, fields: ProfileFields, requestId: string): Promise<Profile>;
  updateProfile(userId: string, fields: ProfileUpdateFields, requestId: string): Promise<Profile>;
  changeUsername(
    userId: string,
    username: string,
    usernameNormalized: string,
    requestId: string,
  ): Promise<Profile>;

  listSkillsByUserId(userId: string): Promise<Skill[]>;
  getSkillById(skillId: string): Promise<Skill | null>;
  createSkill(userId: string, fields: SkillFields, requestId: string): Promise<Skill>;
  updateSkill(
    userId: string,
    skillId: string,
    fields: SkillUpdateFields,
    requestId: string,
  ): Promise<Skill>;

  listAchievementsByUserId(userId: string): Promise<Achievement[]>;
  getAchievementById(achievementId: string): Promise<Achievement | null>;
  createAchievement(
    userId: string,
    fields: AchievementFields,
    requestId: string,
  ): Promise<Achievement>;
  updateAchievement(
    userId: string,
    achievementId: string,
    fields: AchievementFields,
    requestId: string,
  ): Promise<Achievement>;
  attachSkillToAchievement(
    userId: string,
    achievementId: string,
    skillId: string,
    requestId: string,
  ): Promise<Achievement>;
  publishAchievement(
    userId: string,
    achievementId: string,
    requestId: string,
  ): Promise<Achievement>;
  unpublishAchievement(
    userId: string,
    achievementId: string,
    requestId: string,
  ): Promise<Achievement>;

  publishPortfolio(userId: string, requestId: string): Promise<void>;
  unpublishPortfolio(userId: string, requestId: string): Promise<void>;
  getPortfolioSettingsByUserId(userId: string): Promise<PortfolioSettings>;
  getPublicPortfolioByUsername(usernameNormalized: string): Promise<PublicPortfolioCandidate | null>;
}
