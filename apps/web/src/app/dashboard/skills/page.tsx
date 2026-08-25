import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTracefolioService } from "@/server/domain";

import { DashboardNav } from "../_components/dashboard-nav";
import { getCurrentUser } from "../_lib/current-user";
import { SkillsWorkspace } from "./skills-workspace";

export const metadata: Metadata = {
  title: "Skills — Tracefolio",
};

export default async function DashboardSkillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

  const skills = await getTracefolioService().listSkills(user.userId);

  return (
    <div className="space-y-8">
      <DashboardNav active="/dashboard/skills" />
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#17211d]">Skills</h1>
        <p className="mt-2 text-sm text-[#526159]">
          Skills are required before an Achievement can later be published — link at least one Skill to each
          Achievement you plan to make public.
        </p>
      </div>
      <SkillsWorkspace skills={skills} />
    </div>
  );
}
