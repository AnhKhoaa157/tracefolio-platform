import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getTracefolioService } from "@/server/domain";

import { DashboardNav } from "./_components/dashboard-nav";
import { PortfolioVisibilityPanel } from "./_components/portfolio-visibility-panel";
import { getCurrentUser } from "./_lib/current-user";

export const metadata: Metadata = {
  title: "Dashboard — Tracefolio",
};

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

  const service = getTracefolioService();
  const [profile, skills, achievements, portfolioSettings] = await Promise.all([
    service.getProfile(user.userId),
    service.listSkills(user.userId),
    service.listAchievements(user.userId),
    service.getPortfolioSettings(user.userId),
  ]);

  const draftAchievements = achievements.filter((achievement) => achievement.status === "DRAFT").slice(0, 5);
  const portfolioHref = portfolioSettings.isPublic ? portfolioSettings.publicUrl : null;

  return (
    <div className="space-y-10">
      <DashboardNav active="/dashboard" />

      <PortfolioVisibilityPanel settings={portfolioSettings} />

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Profile"
          value={profile?.headline || "No headline yet"}
          hint={profile?.bio ? "Bio added" : "Bio missing"}
          href="/dashboard/profile"
          action="Edit profile"
        />
        <SummaryCard
          title="Skills"
          value={String(skills.length)}
          hint={skills.length === 1 ? "Skill added" : "Skills added"}
          href="/dashboard/skills"
          action="Manage Skills"
        />
        <SummaryCard
          title="Achievements"
          value={String(achievements.length)}
          hint={`${draftAchievements.length} recent draft${draftAchievements.length === 1 ? "" : "s"}`}
          href="/dashboard/achievements"
          action="Manage Achievements"
        />
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#17211d]">Recent drafts</h2>
          <Link
            href="/dashboard/achievements"
            className="text-sm font-medium text-[#526159] transition hover:text-[#17211d]"
          >
            View all →
          </Link>
        </div>
        {draftAchievements.length === 0 ? (
          <p className="mt-4 rounded-[1.75rem] border border-dashed border-[#cbd2cc] p-6 text-sm text-[#526159]">
            No Achievements yet.{" "}
            <Link href="/dashboard/achievements" className="underline underline-offset-2">
              Create your first draft
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {draftAchievements.map((achievement) => (
              <li key={achievement.id} className="rounded-2xl border border-[#cbd2cc] bg-white/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[#17211d]">{achievement.title}</p>
                  <span className="shrink-0 rounded-full bg-[#d6e8df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#17211d]">
                    {achievement.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#526159]">{achievement.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#17211d]">Quick actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard title="Edit profile" description="Headline, bio, location, links." href="/dashboard/profile" />
          <ActionCard
            title="Manage Skills"
            description="Add or edit the Skills behind your work."
            href="/dashboard/skills"
          />
          <ActionCard
            title="Manage Achievements"
            description="Draft and edit your evidence."
            href="/dashboard/achievements"
          />
          {portfolioHref ? (
            <ActionCard title="View public portfolio" description="See your public page." href={portfolioHref} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  href,
  action,
}: {
  title: string;
  value: string;
  hint: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#87938a]">{title}</p>
      <p className="mt-3 truncate text-lg font-semibold text-[#17211d]">{value}</p>
      <p className="mt-1 text-sm text-[#526159]">{hint}</p>
      <Link
        href={href}
        className="mt-4 inline-block text-sm font-medium text-[#17211d] underline underline-offset-2"
      >
        {action} →
      </Link>
    </div>
  );
}

function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 transition hover:border-[#17211d] hover:bg-white/80"
    >
      <p className="text-lg font-semibold tracking-[-0.03em] text-[#17211d]">{title}</p>
      <p className="mt-2 text-sm text-[#526159]">{description}</p>
    </Link>
  );
}
