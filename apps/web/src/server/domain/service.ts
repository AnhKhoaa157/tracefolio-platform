import type {
  Achievement,
  CreateAchievementRequest,
  CreateProfileRequest,
  CreateSkillRequest,
  Profile,
  PublicPortfolio,
  Skill,
  UpdateAchievementRequest,
  UpdateProfileRequest,
  UpdateSkillRequest,
} from "@/contracts/portfolio";

import { DatabaseFailure } from "../db/errors";
import {
  conflict,
  DomainError,
  forbidden,
  invalidInput,
  invalidState,
  notFound,
  publishRequiresSkill,
} from "./errors";
import type {
  AchievementFields,
  ProfileFields,
  ProfileUpdateFields,
  SkillFields,
  SkillUpdateFields,
  TracefolioRepository,
} from "./ports";
import { toPublicPortfolio } from "./visibility";
import {
  normalizeLinks,
  normalizeOccurredAt,
  normalizeUsername,
  optionalText,
  requireIdentifier,
  requireText,
  requireUserId,
} from "./validation";

export interface CreateProfileCommand extends CreateProfileRequest {
  userId: string;
  requestId?: string;
}

export interface UpdateProfileCommand extends UpdateProfileRequest {
  userId: string;
  requestId?: string;
}

export interface ChangeUsernameCommand {
  userId: string;
  username: string;
  requestId?: string;
}

export interface CreateSkillCommand extends CreateSkillRequest {
  userId: string;
  requestId?: string;
}

export interface UpdateSkillCommand extends UpdateSkillRequest {
  userId: string;
  skillId: string;
  requestId?: string;
}

export interface CreateAchievementCommand extends CreateAchievementRequest {
  userId: string;
  requestId?: string;
  // Deliberately accepted only at the boundary and ignored. Creation never accepts visibility.
  status?: unknown;
}

export interface UpdateAchievementCommand extends UpdateAchievementRequest {
  userId: string;
  achievementId: string;
  requestId?: string;
  // Deliberately accepted only at the boundary and ignored. Visibility changes are commands.
  status?: unknown;
}

export interface AchievementActionCommand {
  userId: string;
  achievementId: string;
  requestId?: string;
}

export interface PortfolioActionCommand {
  userId: string;
  requestId?: string;
}

export class TracefolioService {
  constructor(private readonly repository: TracefolioRepository) {}

  async getProfile(userId: string): Promise<Profile | null> {
    return this.repository.getProfileByUserId(requireUserId(userId));
  }

  async createProfile(command: CreateProfileCommand): Promise<Profile> {
    const userId = requireUserId(command.userId);
    const username = normalizeUsername(command.username);
    const fields: ProfileFields = {
      ...username,
      headline: optionalText(command.headline, "headline", 160),
      bio: optionalText(command.bio, "bio", 4_000),
      location: optionalText(command.location, "location", 160),
      avatarUrl: normalizeAvatarUrl(command.avatarUrl),
      links: normalizeLinks(command.links),
    };

    await this.repository.assertUserCanWrite(userId);
    try {
      return await this.repository.createProfile(userId, fields, requestId(command.requestId));
    } catch (error) {
      throw mapRepositoryError(error, "A profile already exists for this account.");
    }
  }

  async updateProfile(command: UpdateProfileCommand): Promise<Profile> {
    const userId = requireUserId(command.userId);
    const current = await this.repository.getProfileByUserId(userId);
    if (!current) throw notFound("The profile was not found.");

    const fields: ProfileUpdateFields = {
      headline: command.headline === undefined ? current.headline : optionalText(command.headline, "headline", 160),
      bio: command.bio === undefined ? current.bio : optionalText(command.bio, "bio", 4_000),
      location: command.location === undefined ? current.location : optionalText(command.location, "location", 160),
      avatarUrl: command.avatarUrl === undefined ? current.avatarUrl : normalizeAvatarUrl(command.avatarUrl),
      links: command.links === undefined ? current.links : normalizeLinks(command.links),
    };

    await this.repository.assertUserCanWrite(userId);
    return this.repository.updateProfile(userId, fields, requestId(command.requestId));
  }

  async changeUsername(command: ChangeUsernameCommand): Promise<Profile> {
    const userId = requireUserId(command.userId);
    const username = normalizeUsername(command.username);
    await this.repository.assertUserCanWrite(userId);

    try {
      return await this.repository.changeUsername(
        userId,
        username.username,
        username.usernameNormalized,
        requestId(command.requestId),
      );
    } catch (error) {
      throw mapRepositoryError(error, "That username is already in use.");
    }
  }

  async listSkills(userId: string): Promise<Skill[]> {
    return this.repository.listSkillsByUserId(requireUserId(userId));
  }

  async createSkill(command: CreateSkillCommand): Promise<Skill> {
    const userId = requireUserId(command.userId);
    const fields = normalizeSkillFields(command.name, command.description);
    await this.repository.assertUserCanWrite(userId);

    try {
      return await this.repository.createSkill(userId, fields, requestId(command.requestId));
    } catch (error) {
      throw mapRepositoryError(error, "That Skill already exists for this account.");
    }
  }

  async updateSkill(command: UpdateSkillCommand): Promise<Skill> {
    const userId = requireUserId(command.userId);
    const skillId = requireIdentifier(command.skillId, "skill id");
    const current = await this.repository.getSkillById(skillId);
    assertOwned(current, userId, "The Skill was not found.");

    const fields: SkillUpdateFields = normalizeSkillFields(
      command.name === undefined ? current.name : command.name,
      command.description === undefined ? current.description : command.description,
    );
    await this.repository.assertUserCanWrite(userId);

    try {
      return await this.repository.updateSkill(userId, skillId, fields, requestId(command.requestId));
    } catch (error) {
      throw mapRepositoryError(error, "That Skill already exists for this account.");
    }
  }

  async listAchievements(userId: string): Promise<Achievement[]> {
    return this.repository.listAchievementsByUserId(requireUserId(userId));
  }

  async createAchievement(command: CreateAchievementCommand): Promise<Achievement> {
    const userId = requireUserId(command.userId);
    const fields = normalizeAchievementFields(command);
    await this.repository.assertUserCanWrite(userId);

    // The repository also hard-codes DRAFT in SQL. This command intentionally has no status field.
    return this.repository.createAchievement(userId, fields, requestId(command.requestId));
  }

  async updateAchievement(command: UpdateAchievementCommand): Promise<Achievement> {
    const userId = requireUserId(command.userId);
    const achievementId = requireIdentifier(command.achievementId, "achievement id");
    const current = await this.repository.getAchievementById(achievementId);
    assertOwned(current, userId, "The achievement was not found.");

    const fields = normalizeAchievementFields({
      title: command.title === undefined ? current.title : command.title,
      summary: command.summary === undefined ? current.summary : command.summary,
      context: command.context === undefined ? current.context : command.context,
      contribution: command.contribution === undefined ? current.contribution : command.contribution,
      impact: command.impact === undefined ? current.impact : command.impact,
      occurredAt: command.occurredAt === undefined ? current.occurredAt : command.occurredAt,
    });

    await this.repository.assertUserCanWrite(userId);
    // A supplied status is ignored; PUBLIC can only be reached through publishAchievement.
    return this.repository.updateAchievement(
      userId,
      achievementId,
      fields,
      requestId(command.requestId),
    );
  }

  async attachSkillToAchievement(
    command: AchievementActionCommand & { skillId: string },
  ): Promise<Achievement> {
    const userId = requireUserId(command.userId);
    const achievementId = requireIdentifier(command.achievementId, "achievement id");
    const skillId = requireIdentifier(command.skillId, "skill id");
    const [achievement, skill] = await Promise.all([
      this.repository.getAchievementById(achievementId),
      this.repository.getSkillById(skillId),
    ]);
    assertOwned(achievement, userId, "The achievement was not found.");
    assertOwned(skill, userId, "The Skill was not found.");
    await this.repository.assertUserCanWrite(userId);

    return this.repository.attachSkillToAchievement(
      userId,
      achievementId,
      skillId,
      requestId(command.requestId),
    );
  }

  async publishAchievement(command: AchievementActionCommand): Promise<Achievement> {
    const userId = requireUserId(command.userId);
    const achievementId = requireIdentifier(command.achievementId, "achievement id");
    const current = await this.repository.getAchievementById(achievementId);
    assertOwned(current, userId, "The achievement was not found.");
    if (current.status === "ARCHIVED") throw invalidState("Archived achievements cannot be published.");
    if (current.status !== "PUBLIC" && current.skills.length === 0) throw publishRequiresSkill();

    await this.repository.assertUserCanWrite(userId);
    return this.repository.publishAchievement(
      userId,
      achievementId,
      requestId(command.requestId),
    );
  }

  async unpublishAchievement(command: AchievementActionCommand): Promise<Achievement> {
    const userId = requireUserId(command.userId);
    const achievementId = requireIdentifier(command.achievementId, "achievement id");
    const current = await this.repository.getAchievementById(achievementId);
    assertOwned(current, userId, "The achievement was not found.");

    // Deliberately no assertUserCanWrite: unpublish is the emergency privacy action allowed during a soft gate.
    return this.repository.unpublishAchievement(
      userId,
      achievementId,
      requestId(command.requestId),
    );
  }

  async publishPortfolio(command: PortfolioActionCommand): Promise<void> {
    const userId = requireUserId(command.userId);
    await this.repository.assertUserCanWrite(userId);
    await this.repository.publishPortfolio(userId, requestId(command.requestId));
  }

  async unpublishPortfolio(command: PortfolioActionCommand): Promise<void> {
    const userId = requireUserId(command.userId);
    // Deliberately no assertUserCanWrite: unpublish is always available in CONSENT_REQUIRED.
    await this.repository.unpublishPortfolio(userId, requestId(command.requestId));
  }

  async getPublicPortfolio(username: string): Promise<PublicPortfolio | null> {
    const normalized = normalizeUsername(username).usernameNormalized;
    return toPublicPortfolio(await this.repository.getPublicPortfolioByUsername(normalized));
  }
}

function normalizeSkillFields(name: unknown, description: unknown): SkillFields {
  const normalizedName = requireText(name, "name", 80);
  return {
    name: normalizedName,
    nameNormalized: normalizedName.toLowerCase(),
    description: optionalText(description, "description", 1_000),
  };
}

function normalizeAchievementFields(input: {
  title: unknown;
  summary: unknown;
  context?: unknown;
  contribution?: unknown;
  impact?: unknown;
  occurredAt?: unknown;
}): AchievementFields {
  return {
    title: requireText(input.title, "title", 160),
    summary: requireText(input.summary, "summary", 2_000),
    context: optionalText(input.context, "context", 2_000),
    contribution: optionalText(input.contribution, "contribution", 2_000),
    impact: optionalText(input.impact, "impact", 2_000),
    occurredAt: normalizeOccurredAt(input.occurredAt),
  };
}

function normalizeAvatarUrl(value: unknown): string | null {
  const avatarUrl = optionalText(value, "avatarUrl", 2_048);
  if (!avatarUrl) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(avatarUrl);
  } catch {
    throw invalidInput("avatarUrl must be a valid HTTP or HTTPS URL.");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw invalidInput("avatarUrl must use HTTP or HTTPS.");
  }
  return avatarUrl;
}

function assertOwned<T extends { userId: string }>(
  resource: T | null,
  userId: string,
  notFoundMessage: string,
): asserts resource is T {
  if (!resource) throw notFound(notFoundMessage);
  if (resource.userId !== userId) throw forbidden();
}

function requestId(value: string | undefined): string {
  if (value && value.length <= 128) return value;
  return globalThis.crypto.randomUUID();
}

function mapRepositoryError(error: unknown, conflictMessage: string): Error {
  if (error instanceof DatabaseFailure && error.code === "DATABASE_CONSTRAINT") {
    return conflict(conflictMessage);
  }
  if (error instanceof DomainError) return error;
  return error instanceof Error ? error : new Error("The request could not be completed.");
}
