import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTracefolioService } from "@/server/domain";

import { DashboardNav } from "../_components/dashboard-nav";
import { getCurrentUser } from "../_lib/current-user";
import { AchievementsWorkspace } from "./achievements-workspace";

export const metadata: Metadata = {
  title: "Achievements — Tracefolio",
};

export default async function DashboardAchievementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

  const service = getTracefolioService();
  const [achievements, skills] = await Promise.all([
    service.listAchievements(user.userId),
    service.listSkills(user.userId),
  ]);

  return (
    <div className="space-y-8">
      <DashboardNav active="/dashboard/achievements" />
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#17211d]">Achievements</h1>
        <p className="mt-2 text-sm text-[#526159]">
          New Achievements are always saved as private Drafts. Publishing isn&apos;t available yet in this
          milestone.
        </p>
      </div>
      <AchievementsWorkspace achievements={achievements} skills={skills} />
    </div>
  );
}
