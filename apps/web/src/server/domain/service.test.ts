import { strict as assert } from "node:assert";
import test from "node:test";

import type {
  Achievement,
  Profile,
  PortfolioSettings,
  Skill,
} from "@/contracts/portfolio";

import { consentRequired, DomainError } from "./errors";
import type { PublicPortfolioCandidate, TracefolioRepository } from "./ports";
import { TracefolioService } from "./service";

const ownerId = "user-owner";
const otherUserId = "user-other";

test("publish rejects an achievement without a Skill", async () => {
  const achievement = makeAchievement({ userId: ownerId, skills: [] });
  let transitionCalled = false;
  const service = new TracefolioService(
    repository({
      getAchievementById: async () => achievement,
      publishAchievement: async () => {
        transitionCalled = true;
        return achievement;
      },
    }),
  );

  await assert.rejects(
    service.publishAchievement({ userId: ownerId, achievementId: achievement.id }),
    (error: unknown) => error instanceof DomainError && error.code === "PUBLISH_REQUIRES_SKILL",
  );
  assert.equal(transitionCalled, false);
});

test("cross-owner Achievement and Skill links are rejected", async () => {
  const achievement = makeAchievement({ userId: ownerId });
  const skill = makeSkill({ userId: otherUserId });
  const service = new TracefolioService(
    repository({
      getAchievementById: async () => achievement,
      getSkillById: async () => skill,
    }),
  );

  await assert.rejects(
    service.attachSkillToAchievement({
      userId: ownerId,
      achievementId: achievement.id,
      skillId: skill.id,
    }),
    (error: unknown) => error instanceof DomainError && error.code === "FORBIDDEN",
  );
});

test("public portfolio access remains unauthenticated and excludes non-public achievements", async () => {
  const candidate: PublicPortfolioCandidate = {
    profile: {
      userId: ownerId,
      username: "owner",
      headline: "Builder",
      bio: null,
      location: null,
      avatarUrl: null,
      links: [],
    },
    userStatus: "ACTIVE",
    isPortfolioPublic: true,
    achievements: [
      publicCandidate("public", "PUBLIC"),
      publicCandidate("draft", "DRAFT"),
      publicCandidate("private", "PRIVATE"),
      publicCandidate("archived", "ARCHIVED"),
    ],
  };
  const service = new TracefolioService(
    repository({ getPublicPortfolioByUsername: async () => candidate }),
  );

  const portfolio = await service.getPublicPortfolio("owner");
  assert.deepEqual(portfolio?.achievements.map((achievement) => achievement.id), ["public"]);
});

test("private portfolio access returns no public portfolio", async () => {
  const service = new TracefolioService(
    repository({
      getPublicPortfolioByUsername: async () => ({
        profile: makeProfile(),
        userStatus: "ACTIVE",
        isPortfolioPublic: false,
        achievements: [publicCandidate("public", "PUBLIC")],
      }),
    }),
  );

  assert.equal(await service.getPublicPortfolio("owner"), null);
});

test("portfolio settings are read for the authenticated user", async () => {
  let receivedUserId = "";
  const settings: PortfolioSettings = { isPublic: true, publicUrl: "/p/owner" };
  const service = new TracefolioService(
    repository({
      getPortfolioSettingsByUserId: async (userId) => {
        receivedUserId = userId;
        return settings;
      },
    }),
  );

  assert.deepEqual(await service.getPortfolioSettings(ownerId), settings);
  assert.equal(receivedUserId, ownerId);
});

test("unpublish does not require ACTIVE consent state", async () => {
  const achievement = makeAchievement({ userId: ownerId, status: "PUBLIC" });
  let called = false;
  const service = new TracefolioService(
    repository({
      getAchievementById: async () => achievement,
      assertUserCanWrite: async () => {
        throw new DomainError("CONSENT_REQUIRED", "should not be called", 403);
      },
      unpublishAchievement: async () => {
        called = true;
        return { ...achievement, status: "PRIVATE", publishedAt: null };
      },
    }),
  );

  const result = await service.unpublishAchievement({
    userId: ownerId,
    achievementId: achievement.id,
  });
  assert.equal(called, true);
  assert.equal(result.status, "PRIVATE");
});

test("consent-required users cannot write private portfolio data", async () => {
  const service = new TracefolioService(
    repository({
      assertUserCanWrite: async () => {
        throw consentRequired();
      },
    }),
  );

  await assert.rejects(
    service.createSkill({ userId: ownerId, name: "Product thinking" }),
    (error: unknown) => error instanceof DomainError && error.code === "CONSENT_REQUIRED",
  );
});

test("portfolio unpublish remains available while consent is required", async () => {
  let called = false;
  const service = new TracefolioService(
    repository({
      assertUserCanWrite: async () => {
        throw consentRequired();
      },
      unpublishPortfolio: async () => {
        called = true;
      },
    }),
  );

  await service.unpublishPortfolio({ userId: ownerId });
  assert.equal(called, true);
});

test("create command cannot select PUBLIC visibility", async () => {
  let received: unknown;
  const service = new TracefolioService(
    repository({
      createAchievement: async (_userId, fields) => {
        received = fields;
        return makeAchievement({ userId: ownerId, status: "DRAFT" });
      },
    }),
  );

  const result = await service.createAchievement({
    userId: ownerId,
    title: "Documented outcome",
    summary: "A server-validated outcome.",
    status: "PUBLIC",
  });

  assert.equal(result.status, "DRAFT");
  assert.equal("status" in (received as object), false);
});

function repository(overrides: Partial<TracefolioRepository>): TracefolioRepository {
  const defaults: TracefolioRepository = {
    assertUserCanWrite: async () => undefined,
    getProfileByUserId: async () => null,
    createProfile: async () => makeProfile(),
    updateProfile: async () => makeProfile(),
    changeUsername: async () => makeProfile(),
    listSkillsByUserId: async () => [],
    getSkillById: async () => null,
    createSkill: async () => makeSkill(),
    updateSkill: async () => makeSkill(),
    listAchievementsByUserId: async () => [],
    getAchievementById: async () => null,
    createAchievement: async () => makeAchievement({ userId: ownerId }),
    updateAchievement: async () => makeAchievement({ userId: ownerId }),
    attachSkillToAchievement: async () => makeAchievement({ userId: ownerId }),
    publishAchievement: async () => makeAchievement({ userId: ownerId, status: "PUBLIC" }),
    unpublishAchievement: async () => makeAchievement({ userId: ownerId, status: "PRIVATE" }),
    publishPortfolio: async () => undefined,
    unpublishPortfolio: async () => undefined,
    getPortfolioSettingsByUserId: async () => ({ isPublic: false, publicUrl: "/p/owner" }),
    getPublicPortfolioByUsername: async () => null,
  };

  return { ...defaults, ...overrides };
}

function makeProfile(): Profile {
  return {
    userId: ownerId,
    username: "owner",
    headline: null,
    bio: null,
    location: null,
    avatarUrl: null,
    links: [],
  };
}

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "skill-1",
    userId: ownerId,
    name: "Product thinking",
    description: null,
    ...overrides,
  };
}

function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: "achievement-1",
    userId: ownerId,
    title: "Documented outcome",
    summary: "A server-validated outcome.",
    context: null,
    contribution: null,
    impact: null,
    occurredAt: null,
    status: "DRAFT",
    publishedAt: null,
    skills: [makeSkill()],
    ...overrides,
  };
}

function publicCandidate(
  id: string,
  status: Achievement["status"],
): PublicPortfolioCandidate["achievements"][number] {
  return {
    id,
    userId: ownerId,
    title: id,
    summary: id,
    context: null,
    contribution: null,
    impact: null,
    occurredAt: null,
    publishedAt: status === "PUBLIC" ? "2026-01-01T00:00:00.000Z" : null,
    status,
    skills: [],
  };
}
