import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 lg:px-10">
      <header className="border-b border-[#cbd2cc] pb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">
          {profile.username} · public portfolio
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.07em] text-[#17211d] sm:text-7xl">
          {profile.headline ?? `Work by ${profile.username}`}
        </h1>
        {profile.bio ? <p className="mt-7 max-w-2xl text-lg leading-8 text-[#526159]">{profile.bio}</p> : null}
        {profile.location ? <p className="mt-4 text-sm text-[#87938a]">{profile.location}</p> : null}
        {profile.links.length > 0 ? (
          <nav aria-label="Profile links" className="mt-7 flex flex-wrap gap-3">
            {profile.links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                rel="noreferrer"
                target="_blank"
                className="rounded-full border border-[#b7c0b9] px-3 py-1.5 text-sm text-[#526159] transition hover:border-[#17211d] hover:text-[#17211d]"
              >
                {link.label} ↗
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      <section className="py-14">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">Selected evidence</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#17211d]">
              What changed because I was there.
            </h2>
          </div>
          <span className="shrink-0 whitespace-nowrap text-sm text-[#87938a]">
            {achievements.length} {achievements.length === 1 ? "outcome" : "outcomes"}
          </span>
        </div>

        {achievements.length > 0 ? (
          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <article
                key={achievement.id}
                className="grid gap-8 rounded-[1.75rem] bg-[#17211d] p-7 text-[#f4f0e8] md:grid-cols-[0.18fr_0.82fr] md:p-10"
              >
                <span className="text-sm text-[#9cac9f]">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-sm text-[#9cac9f]">{formatOccurredAt(achievement.occurredAt)}</p>
                  <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl">
                    {achievement.title}
                  </h3>
                  <p className="mt-6 max-w-2xl text-base leading-7 text-[#bdc8c0]">{achievement.summary}</p>
                  {achievement.context || achievement.contribution || achievement.impact ? (
                    <dl className="mt-8 grid gap-5 text-sm leading-6 text-[#d6e0d8] sm:grid-cols-3">
                      {achievement.context ? <div><dt className="text-[#9cac9f]">Context</dt><dd>{achievement.context}</dd></div> : null}
                      {achievement.contribution ? <div><dt className="text-[#9cac9f]">Contribution</dt><dd>{achievement.contribution}</dd></div> : null}
                      {achievement.impact ? <div><dt className="text-[#9cac9f]">Impact</dt><dd>{achievement.impact}</dd></div> : null}
                    </dl>
                  ) : null}
                  <div className="mt-8 flex flex-wrap gap-2">
                    {achievement.skills.map((skill) => (
                      <span key={skill.name} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-[#d6e0d8]">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.75rem] bg-[#d6e8df] p-8 text-[#526159]">No public achievements yet.</p>
        )}
      </section>
    </main>
  );
}

function formatOccurredAt(value: string | null): string {
  if (!value) return "Achievement";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(value));
}
