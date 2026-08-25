import "server-only";

import { randomUUID } from "node:crypto";

import type {
  Achievement,
  Profile,
  ProfileLink,
  PublicSkill,
  Skill,
} from "@/contracts/portfolio";

import { getDatabase } from "../db/client";
import type { Database, DatabaseQuery } from "../db/types";
import {
  consentRequired,
  forbidden,
  invalidState,
  notFound,
  publishRequiresSkill,
} from "../domain/errors";
import type {
  AchievementFields,
  ProfileFields,
  ProfileUpdateFields,
  PublicAchievementCandidate,
  PublicPortfolioCandidate,
  SkillFields,
  SkillUpdateFields,
  TracefolioRepository,
  UserStatus,
} from "../domain/ports";

const USERNAME_ALIAS_RETENTION_DAYS = 365;

interface ProfileRow {
  user_id: string;
  username: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  links_json: unknown;
}

interface SkillRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
}

interface AchievementRow {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  context: string | null;
  contribution: string | null;
  impact: string | null;
  occurred_at: Date | string | null;
  status: Achievement["status"];
  published_at: Date | string | null;
  skills_json: unknown;
}

interface PublicPortfolioRow {
  user_id: string;
  user_status: UserStatus;
  is_portfolio_public: boolean;
  username: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  links_json: unknown;
  achievements_json: unknown;
}

interface UserRow {
  status: "ACTIVE" | "CONSENT_REQUIRED" | "PENDING_DELETION" | "SUSPENDED";
}

interface OwnershipRow {
  user_id: string;
}

export class PostgresTracefolioRepository implements TracefolioRepository {
  constructor(private readonly database: Database = getDatabase()) {}

  async assertUserCanWrite(userId: string): Promise<void> {
    const result = await this.database.query<UserRow>(
      "SELECT status FROM users WHERE id = $1",
      [userId],
    );
    const user = result.rows[0];

    if (!user) throw notFound("The account was not found.");
    if (user.status === "CONSENT_REQUIRED") throw consentRequired();
    if (user.status !== "ACTIVE") {
      throw forbidden("This account cannot modify portfolio data.");
    }
  }

  async getProfileByUserId(userId: string): Promise<Profile | null> {
    const result = await this.database.query<ProfileRow>(
      `
        SELECT user_id, username, headline, bio, location, avatar_url, links_json
        FROM profiles
        WHERE user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ? mapProfile(result.rows[0]) : null;
  }

  async createProfile(userId: string, fields: ProfileFields, requestId: string): Promise<Profile> {
    return this.database.transaction(async (connection) => {
      const result = await connection.query<ProfileRow>(
        `
          INSERT INTO profiles (
            user_id, username, username_normalized, headline, bio, location, avatar_url, links_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          RETURNING user_id, username, headline, bio, location, avatar_url, links_json
        `,
        [
          userId,
          fields.username,
          fields.usernameNormalized,
          fields.headline,
          fields.bio,
          fields.location,
          fields.avatarUrl,
          JSON.stringify(fields.links),
        ],
      );

      await connection.query(
        `
          INSERT INTO portfolio_settings (user_id, is_public)
          VALUES ($1, false)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [userId],
      );
      await writeAudit(connection, userId, "PROFILE", userId, "PROFILE_CREATED", requestId);

      return mapProfile(result.rows[0]);
    });
  }

  async updateProfile(
    userId: string,
    fields: ProfileUpdateFields,
    requestId: string,
  ): Promise<Profile> {
    return this.database.transaction(async (connection) => {
      const result = await connection.query<ProfileRow>(
        `
          UPDATE profiles
          SET headline = $2, bio = $3, location = $4, avatar_url = $5, links_json = $6::jsonb
          WHERE user_id = $1
          RETURNING user_id, username, headline, bio, location, avatar_url, links_json
        `,
        [
          userId,
          fields.headline,
          fields.bio,
          fields.location,
          fields.avatarUrl,
          JSON.stringify(fields.links),
        ],
      );

      if (!result.rows[0]) await throwProfileOwnership(connection, userId);
      await writeAudit(connection, userId, "PROFILE", userId, "PROFILE_UPDATED", requestId);
      return mapProfile(result.rows[0]);
    });
  }

  async changeUsername(
    userId: string,
    username: string,
    usernameNormalized: string,
    requestId: string,
  ): Promise<Profile> {
    return this.database.transaction(async (connection) => {
      const currentResult = await connection.query<ProfileRow>(
        `
          SELECT user_id, username, headline, bio, location, avatar_url, links_json
          FROM profiles
          WHERE user_id = $1
          FOR UPDATE
        `,
        [userId],
      );
      const current = currentResult.rows[0];

      if (!current) await throwProfileOwnership(connection, userId);
      if (current.username.toLowerCase() === usernameNormalized) {
        return mapProfile(current);
      }

      await connection.query(
        `
          INSERT INTO username_aliases (username_normalized, user_id, expires_at)
          VALUES ($1, $2, now() + make_interval(days => $3))
          ON CONFLICT (username_normalized) DO UPDATE
          SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
          WHERE username_aliases.user_id = EXCLUDED.user_id
        `,
        [current.username.toLowerCase(), userId, USERNAME_ALIAS_RETENTION_DAYS],
      );

      const result = await connection.query<ProfileRow>(
        `
          UPDATE profiles
          SET username = $2, username_normalized = $3
          WHERE user_id = $1
          RETURNING user_id, username, headline, bio, location, avatar_url, links_json
        `,
        [userId, username, usernameNormalized],
      );

      await writeAudit(connection, userId, "PROFILE", userId, "USERNAME_CHANGED", requestId);
      return mapProfile(result.rows[0]);
    });
  }

  async listSkillsByUserId(userId: string): Promise<Skill[]> {
    const result = await this.database.query<SkillRow>(
      `
        SELECT id, user_id, name, description
        FROM skills
        WHERE user_id = $1
        ORDER BY name_normalized ASC, id ASC
      `,
      [userId],
    );

    return result.rows.map(mapSkill);
  }

  async getSkillById(skillId: string): Promise<Skill | null> {
    const result = await this.database.query<SkillRow>(
      "SELECT id, user_id, name, description FROM skills WHERE id = $1",
      [skillId],
    );

    return result.rows[0] ? mapSkill(result.rows[0]) : null;
  }

  async createSkill(userId: string, fields: SkillFields, requestId: string): Promise<Skill> {
    return this.database.transaction(async (connection) => {
      const result = await connection.query<SkillRow>(
        `
          INSERT INTO skills (id, user_id, name, name_normalized, description)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, user_id, name, description
        `,
        [randomUUID(), userId, fields.name, fields.nameNormalized, fields.description],
      );
      await writeAudit(connection, userId, "SKILL", result.rows[0].id, "SKILL_CREATED", requestId);
      return mapSkill(result.rows[0]);
    });
  }

  async updateSkill(
    userId: string,
    skillId: string,
    fields: SkillUpdateFields,
    requestId: string,
  ): Promise<Skill> {
    return this.database.transaction(async (connection) => {
      const result = await connection.query<SkillRow>(
        `
          UPDATE skills
          SET name = $3, name_normalized = $4, description = $5
          WHERE id = $1 AND user_id = $2
          RETURNING id, user_id, name, description
        `,
        [skillId, userId, fields.name, fields.nameNormalized, fields.description],
      );

      if (!result.rows[0]) await throwOwnedResource(connection, "skills", skillId, userId);
      await writeAudit(connection, userId, "SKILL", skillId, "SKILL_UPDATED", requestId);
      return mapSkill(result.rows[0]);
    });
  }

  async listAchievementsByUserId(userId: string): Promise<Achievement[]> {
    const result = await this.database.query<AchievementRow>(achievementSelect("a.user_id = $1"), [
      userId,
    ]);

    return result.rows.map(mapAchievement);
  }

  async getAchievementById(achievementId: string): Promise<Achievement | null> {
    const result = await this.database.query<AchievementRow>(
      achievementSelect("a.id = $1"),
      [achievementId],
    );

    return result.rows[0] ? mapAchievement(result.rows[0]) : null;
  }

  async createAchievement(
    userId: string,
    fields: AchievementFields,
    requestId: string,
  ): Promise<Achievement> {
    return this.database.transaction(async (connection) => {
      const result = await connection.query<AchievementRow>(
        `
          INSERT INTO achievements (
            id, user_id, title, summary, context, contribution, impact, occurred_at, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
          RETURNING id, user_id, title, summary, context, contribution, impact, occurred_at,
            status, published_at, '[]'::jsonb AS skills_json
        `,
        [
          randomUUID(),
          userId,
          fields.title,
          fields.summary,
          fields.context,
          fields.contribution,
          fields.impact,
          fields.occurredAt,
        ],
      );
      await writeAudit(
        connection,
        userId,
        "ACHIEVEMENT",
        result.rows[0].id,
        "ACHIEVEMENT_CREATED",
        requestId,
      );
      return mapAchievement(result.rows[0]);
    });
  }

  async updateAchievement(
    userId: string,
    achievementId: string,
    fields: AchievementFields,
    requestId: string,
  ): Promise<Achievement> {
    return this.database.transaction(async (connection) => {
      const result = await connection.query<AchievementRow>(
        `
          UPDATE achievements
          SET title = $3, summary = $4, context = $5, contribution = $6, impact = $7, occurred_at = $8
          WHERE id = $1 AND user_id = $2
          RETURNING id, user_id, title, summary, context, contribution, impact, occurred_at,
            status, published_at, '[]'::jsonb AS skills_json
        `,
        [
          achievementId,
          userId,
          fields.title,
          fields.summary,
          fields.context,
          fields.contribution,
          fields.impact,
          fields.occurredAt,
        ],
      );

      if (!result.rows[0]) await throwOwnedResource(connection, "achievements", achievementId, userId);
      const achievement = await loadAchievement(connection, achievementId);
      await writeAudit(connection, userId, "ACHIEVEMENT", achievementId, "ACHIEVEMENT_UPDATED", requestId);
      return achievement;
    });
  }

  async attachSkillToAchievement(
    userId: string,
    achievementId: string,
    skillId: string,
    requestId: string,
  ): Promise<Achievement> {
    return this.database.transaction(async (connection) => {
      const ownership = await connection.query<{ achievement_user_id: string; skill_user_id: string }>(
        `
          SELECT a.user_id AS achievement_user_id, s.user_id AS skill_user_id
          FROM achievements a
          CROSS JOIN skills s
          WHERE a.id = $1 AND s.id = $2
          FOR UPDATE OF a, s
        `,
        [achievementId, skillId],
      );
      const owners = ownership.rows[0];

      if (!owners) {
        const existingAchievement = await connection.query<OwnershipRow>(
          "SELECT user_id FROM achievements WHERE id = $1",
          [achievementId],
        );
        const existingSkill = await connection.query<OwnershipRow>(
          "SELECT user_id FROM skills WHERE id = $1",
          [skillId],
        );
        if (existingAchievement.rows[0]?.user_id !== userId || existingSkill.rows[0]?.user_id !== userId) {
          if (existingAchievement.rows[0] || existingSkill.rows[0]) throw forbidden();
        }
        throw notFound("The achievement or skill was not found.");
      }

      if (
        owners.achievement_user_id !== userId ||
        owners.skill_user_id !== userId ||
        owners.achievement_user_id !== owners.skill_user_id
      ) {
        throw forbidden();
      }

      await connection.query(
        `
          INSERT INTO achievement_skills (achievement_id, skill_id)
          VALUES ($1, $2)
          ON CONFLICT (achievement_id, skill_id) DO NOTHING
        `,
        [achievementId, skillId],
      );
      await writeAudit(
        connection,
        userId,
        "ACHIEVEMENT",
        achievementId,
        "ACHIEVEMENT_SKILL_ATTACHED",
        requestId,
        { skill_id: skillId },
      );

      return loadAchievement(connection, achievementId);
    });
  }

  async publishAchievement(
    userId: string,
    achievementId: string,
    requestId: string,
  ): Promise<Achievement> {
    return this.database.transaction(async (connection) => {
      await assertActiveUser(connection, userId);
      const current = await loadAchievementForUpdate(connection, achievementId);

      if (!current) throw notFound("The achievement was not found.");
      if (current.user_id !== userId) throw forbidden();
      if (current.status === "PUBLIC") return mapAchievement(current);
      if (current.status === "ARCHIVED") throw invalidState("Archived achievements cannot be published.");
      if (current.status !== "DRAFT" && current.status !== "PRIVATE") {
        throw invalidState("This achievement cannot be published from its current state.");
      }
      if (!current.title.trim() || !current.summary.trim()) {
        throw invalidState("Title and summary are required before publishing.");
      }

      const skillCount = await connection.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM achievement_skills WHERE achievement_id = $1",
        [achievementId],
      );
      if (Number(skillCount.rows[0]?.count ?? 0) < 1) {
        throw publishRequiresSkill();
      }

      await connection.query(
        `
          UPDATE achievements
          SET status = 'PUBLIC', published_at = COALESCE(published_at, now())
          WHERE id = $1
        `,
        [achievementId],
      );
      await writeAudit(connection, userId, "ACHIEVEMENT", achievementId, "ACHIEVEMENT_PUBLISHED", requestId);
      return loadAchievement(connection, achievementId);
    });
  }

  async unpublishAchievement(
    userId: string,
    achievementId: string,
    requestId: string,
  ): Promise<Achievement> {
    return this.database.transaction(async (connection) => {
      const current = await loadAchievementForUpdate(connection, achievementId);
      if (!current) throw notFound("The achievement was not found.");
      if (current.user_id !== userId) throw forbidden();

      if (current.status === "PUBLIC") {
        await connection.query(
          `
            UPDATE achievements
            SET status = 'PRIVATE', published_at = NULL
            WHERE id = $1
          `,
          [achievementId],
        );
        await writeAudit(connection, userId, "ACHIEVEMENT", achievementId, "ACHIEVEMENT_UNPUBLISHED", requestId);
      }

      return loadAchievement(connection, achievementId);
    });
  }

  async publishPortfolio(userId: string, requestId: string): Promise<void> {
    return this.database.transaction(async (connection) => {
      await assertActiveUser(connection, userId);
      const result = await connection.query(
        "UPDATE portfolio_settings SET is_public = true WHERE user_id = $1",
        [userId],
      );
      if (!result.rowCount) throw notFound("The profile was not found.");
      await writeAudit(connection, userId, "PORTFOLIO", userId, "PORTFOLIO_PUBLISHED", requestId);
    });
  }

  async unpublishPortfolio(userId: string, requestId: string): Promise<void> {
    return this.database.transaction(async (connection) => {
      await connection.query(
        "UPDATE portfolio_settings SET is_public = false WHERE user_id = $1",
        [userId],
      );
      await writeAudit(connection, userId, "PORTFOLIO", userId, "PORTFOLIO_UNPUBLISHED", requestId);
    });
  }

  async getPublicPortfolioByUsername(
    usernameNormalized: string,
  ): Promise<PublicPortfolioCandidate | null> {
    const result = await this.database.query<PublicPortfolioRow>(
      `
        SELECT
          p.user_id,
          u.status AS user_status,
          ps.is_public AS is_portfolio_public,
          p.username,
          p.headline,
          p.bio,
          p.location,
          p.avatar_url,
          p.links_json,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', a.id,
                'userId', a.user_id,
                'status', a.status,
                'title', a.title,
                'summary', a.summary,
                'context', a.context,
                'contribution', a.contribution,
                'impact', a.impact,
                'occurredAt', a.occurred_at,
                'publishedAt', a.published_at,
                'skills', COALESCE((
                  SELECT jsonb_agg(jsonb_build_object('name', s.name) ORDER BY s.name_normalized, s.id)
                  FROM achievement_skills a_s
                  JOIN skills s ON s.id = a_s.skill_id
                  WHERE a_s.achievement_id = a.id
                ), '[]'::jsonb)
              ) ORDER BY a.published_at DESC, a.id ASC
            )
            FROM achievements a
            WHERE a.user_id = p.user_id AND a.status = 'PUBLIC'
          ), '[]'::jsonb) AS achievements_json
        FROM profiles p
        JOIN users u ON u.id = p.user_id AND u.status = 'ACTIVE'
        JOIN portfolio_settings ps ON ps.user_id = p.user_id AND ps.is_public = true
        WHERE p.username_normalized = $1
          OR EXISTS (
            SELECT 1
            FROM username_aliases ua
            WHERE ua.username_normalized = $1
              AND ua.user_id = p.user_id
              AND ua.expires_at > now()
          )
      `,
      [usernameNormalized],
    );
    const row = result.rows[0];

    if (!row) return null;

    const profile: Profile = {
      userId: row.user_id,
      username: row.username,
      headline: row.headline,
      bio: row.bio,
      location: row.location,
      avatarUrl: row.avatar_url,
      links: parseLinks(row.links_json),
    };

    return {
      profile,
      userStatus: row.user_status,
      isPortfolioPublic: row.is_portfolio_public,
      achievements: parsePublicAchievements(row.achievements_json, row.user_id),
    };
  }
}

function achievementSelect(where: string): string {
  return `
    SELECT
      a.id,
      a.user_id,
      a.title,
      a.summary,
      a.context,
      a.contribution,
      a.impact,
      a.occurred_at,
      a.status,
      a.published_at,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'userId', s.user_id,
            'name', s.name,
            'description', s.description
          ) ORDER BY s.name_normalized, s.id
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::jsonb
      ) AS skills_json
    FROM achievements a
    LEFT JOIN achievement_skills a_s ON a_s.achievement_id = a.id
    LEFT JOIN skills s ON s.id = a_s.skill_id
    WHERE ${where}
    GROUP BY a.id
    ORDER BY a.occurred_at DESC NULLS LAST, a.created_at DESC, a.id ASC
  `;
}

async function loadAchievement(
  connection: DatabaseQuery,
  achievementId: string,
): Promise<Achievement> {
  const result = await connection.query<AchievementRow>(achievementSelect("a.id = $1"), [achievementId]);
  if (!result.rows[0]) throw notFound("The achievement was not found.");
  return mapAchievement(result.rows[0]);
}

async function loadAchievementForUpdate(
  connection: DatabaseQuery,
  achievementId: string,
): Promise<AchievementRow | null> {
  const result = await connection.query<AchievementRow>(
    `
      SELECT id, user_id, title, summary, context, contribution, impact, occurred_at, status,
        published_at, '[]'::jsonb AS skills_json
      FROM achievements
      WHERE id = $1
      FOR UPDATE
    `,
    [achievementId],
  );
  return result.rows[0] ?? null;
}

async function assertActiveUser(connection: DatabaseQuery, userId: string): Promise<void> {
  const result = await connection.query<UserRow>("SELECT status FROM users WHERE id = $1", [userId]);
  const user = result.rows[0];
  if (!user) throw notFound("The account was not found.");
  if (user.status === "CONSENT_REQUIRED") throw consentRequired();
  if (user.status !== "ACTIVE") throw forbidden("This account cannot modify portfolio data.");
}

async function throwProfileOwnership(connection: DatabaseQuery, userId: string): Promise<never> {
  const result = await connection.query<OwnershipRow>("SELECT user_id FROM profiles WHERE user_id = $1", [userId]);
  if (result.rows[0]) throw new Error("Profile update did not return a profile.");
  throw notFound("The profile was not found.");
}

async function throwOwnedResource(
  connection: DatabaseQuery,
  table: "achievements" | "skills",
  resourceId: string,
  userId: string,
): Promise<never> {
  const result = await connection.query<OwnershipRow>(`SELECT user_id FROM ${table} WHERE id = $1`, [resourceId]);
  if (!result.rows[0]) throw notFound("The requested resource was not found.");
  if (result.rows[0].user_id !== userId) throw forbidden();
  throw notFound("The requested resource was not found.");
}

async function writeAudit(
  connection: DatabaseQuery,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  requestId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await connection.query(
    `
      INSERT INTO audit_events (
        id, actor_user_id, subject_user_id, entity_type, entity_id, action, request_id, metadata_json
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [randomUUID(), userId, entityType, entityId, action, requestId, JSON.stringify(metadata)],
  );
}

function mapProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    username: row.username,
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatar_url,
    links: parseLinks(row.links_json),
  };
}

function mapSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
  };
}

function mapAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary,
    context: row.context,
    contribution: row.contribution,
    impact: row.impact,
    occurredAt: toIso(row.occurred_at),
    status: row.status,
    publishedAt: toIso(row.published_at),
    skills: parseSkills(row.skills_json),
  };
}

function parseLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.label !== "string" || typeof item.url !== "string") return [];
    try {
      const url = new URL(item.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return [];
    } catch {
      return [];
    }
    return [{ label: item.label, url: item.url }];
  });
}

function parseSkills(value: unknown): Skill[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !isObject(item) ||
      typeof item.id !== "string" ||
      typeof item.userId !== "string" ||
      typeof item.name !== "string" ||
      (item.description !== null && typeof item.description !== "string")
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        userId: item.userId,
        name: item.name,
        description: item.description,
      },
    ];
  });
}

function parsePublicAchievements(value: unknown, fallbackUserId: string): PublicAchievementCandidate[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !isObject(item) ||
      typeof item.id !== "string" ||
      typeof item.userId !== "string" ||
      typeof item.status !== "string" ||
      typeof item.title !== "string" ||
      typeof item.summary !== "string" ||
      typeof item.publishedAt !== "string"
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        userId: item.userId || fallbackUserId,
        status: item.status as Achievement["status"],
        title: item.title,
        summary: item.summary,
        context: nullableString(item.context),
        contribution: nullableString(item.contribution),
        impact: nullableString(item.impact),
        occurredAt: nullableDateString(item.occurredAt),
        publishedAt: item.publishedAt,
        skills: parsePublicSkills(item.skills),
      },
    ];
  });
}

function parsePublicSkills(value: unknown): PublicSkill[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.name !== "string") return [];
    return [{ name: item.name }];
  });
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableDateString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value as Date | string);
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
