import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { PublicAchievement } from "@/contracts/portfolio";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PublicPortfolioPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicPortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  const portfolio = await getTracefolioService().getPublicPortfolio(username);

  if (!portfolio) return { title: "Portfolio not found — Tracefolio" };

  const title = portfolio.profile.headline
    ? `${portfolio.profile.username} — ${portfolio.profile.headline}`
    : `${portfolio.profile.username} — Tracefolio`;

  return {
    title,
    description: portfolio.profile.bio ?? `Public portfolio for ${portfolio.profile.username}.`,
  };
}

export default async function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { username } = await params;
  const portfolio = await getTracefolioService().getPublicPortfolio(username);

  if (!portfolio) notFound();

  const { profile, achievements } = portfolio;
  const skills = collectSkillNames(achievements);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12 sm:py-16 lg:px-10">
      <header className="border-b border-[#cbd2cc] pb-12 sm:pb-16">
        <p className="break-words text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">
          @{profile.username} · public portfolio
        </p>
        <h1 className="mt-5 max-w-4xl break-words text-5xl font-semibold leading-[0.98] tracking-[-0.07em] text-[#17211d] sm:text-7xl">
          {profile.headline ?? `Work by ${profile.username}`}
        </h1>
        {profile.bio ? (
          <p className="mt-7 max-w-2xl whitespace-pre-line break-words text-lg leading-8 text-[#526159]">
            {profile.bio}
          </p>
        ) : null}
        {profile.location || profile.links.length > 0 ? (
          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            {profile.location ? (
              <p className="min-w-0 max-w-full break-words text-sm text-[#87938a]">{profile.location}</p>
            ) : null}
            {profile.links.length > 0 ? (
              <nav aria-label="Profile links" className="flex min-w-0 flex-wrap gap-2.5">
                {profile.links.map((link) => (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    rel="noreferrer"
                    target="_blank"
                    className="min-w-0 max-w-full break-words rounded-full border border-[#b7c0b9] px-3 py-1.5 text-sm text-[#526159] transition hover:border-[#17211d] hover:text-[#17211d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17211d]"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        ) : null}
      </header>

      {skills.length > 0 ? (
        <section aria-labelledby="skills-heading" className="border-b border-[#cbd2cc] py-10">
          <h2 id="skills-heading" className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">
            Skills
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="min-w-0 max-w-full break-words rounded-full border border-[#b7c0b9] px-3.5 py-1.5 text-sm font-medium text-[#17211d]"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="evidence-heading" className="py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">Selected evidence</p>
            <h2
              id="evidence-heading"
              className="mt-3 break-words text-3xl font-semibold tracking-[-0.05em] text-[#17211d]"
            >
              What changed because I was there.
            </h2>
          </div>
          <span className="shrink-0 whitespace-nowrap text-sm text-[#87938a]">
            {achievements.length} {achievements.length === 1 ? "outcome" : "outcomes"}
          </span>
        </div>

        {achievements.length > 0 ? (
          <ol className="list-none space-y-4">
            {achievements.map((achievement, index) => (
              <li key={achievement.id}>
                <article className="grid gap-8 rounded-[1.75rem] bg-[#17211d] p-7 text-[#f4f0e8] md:grid-cols-[0.18fr_0.82fr] md:p-10">
                  <span className="text-sm text-[#9cac9f]">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-[#9cac9f]">{formatAchievementDate(achievement)}</p>
                    <h3 className="mt-3 max-w-2xl break-words text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl">
                      {achievement.title}
                    </h3>
                    <p className="mt-6 max-w-2xl break-words text-base leading-7 text-[#bdc8c0]">
                      {achievement.summary}
                    </p>
                    {achievement.context || achievement.contribution || achievement.impact ? (
                      <dl className="mt-8 grid gap-5 text-sm leading-6 text-[#d6e0d8] sm:grid-cols-3">
                        {achievement.context ? (
                          <div className="min-w-0">
                            <dt className="text-[#9cac9f]">Context</dt>
                            <dd className="break-words">{achievement.context}</dd>
                          </div>
                        ) : null}
                        {achievement.contribution ? (
                          <div className="min-w-0">
                            <dt className="text-[#9cac9f]">Contribution</dt>
                            <dd className="break-words">{achievement.contribution}</dd>
                          </div>
                        ) : null}
                        {achievement.impact ? (
                          <div className="min-w-0">
                            <dt className="text-[#9cac9f]">Impact</dt>
                            <dd className="break-words">{achievement.impact}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                    {achievement.skills.length > 0 ? (
                      <div className="mt-8">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#9cac9f]">Skills</p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {achievement.skills.map((skill) => (
                            <li
                              key={skill.name}
                              className="min-w-0 max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-[#d6e0d8]"
                            >
                              {skill.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[#b7c0b9] p-10 text-center sm:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">Nothing published yet</p>
            <p className="mx-auto mt-4 max-w-md break-words text-base leading-7 text-[#526159]">
              {profile.username} hasn&apos;t published any public Achievements yet. Check back soon to see the
              evidence behind the work.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function collectSkillNames(achievements: PublicAchievement[]): string[] {
  const seen = new Map<string, string>();
  for (const achievement of achievements) {
    for (const skill of achievement.skills) {
      const key = skill.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, skill.name);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

function formatAchievementDate(achievement: PublicAchievement): string {
  const value = achievement.occurredAt ?? achievement.publishedAt;
  const formatted = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(value));
  return achievement.occurredAt ? formatted : `Published ${formatted}`;
}
