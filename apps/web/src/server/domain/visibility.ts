import type { PublicPortfolio } from "@/contracts/portfolio";

import type { PublicPortfolioCandidate } from "./ports";

export function toPublicPortfolio(
  candidate: PublicPortfolioCandidate | null,
): PublicPortfolio | null {
  if (!candidate || candidate.userStatus !== "ACTIVE" || !candidate.isPortfolioPublic) {
    return null;
  }

  return {
    profile: {
      username: candidate.profile.username,
      headline: candidate.profile.headline,
      bio: candidate.profile.bio,
      location: candidate.profile.location,
      avatarUrl: candidate.profile.avatarUrl,
      links: candidate.profile.links,
    },
    achievements: candidate.achievements
      .filter((achievement) => achievement.status === "PUBLIC" && achievement.publishedAt !== null)
      .map((achievement) => ({
        id: achievement.id,
        title: achievement.title,
        summary: achievement.summary,
        context: achievement.context,
        contribution: achievement.contribution,
        impact: achievement.impact,
        occurredAt: achievement.occurredAt,
        publishedAt: achievement.publishedAt as string,
        skills: achievement.skills,
      })),
  };
}
