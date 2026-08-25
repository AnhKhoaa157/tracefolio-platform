import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTracefolioService } from "@/server/domain";

import { DashboardNav } from "../_components/dashboard-nav";
import { getCurrentUser } from "../_lib/current-user";
import { ProfileEditor } from "./profile-editor";

export const metadata: Metadata = {
  title: "Profile — Tracefolio",
};

export default async function DashboardProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

  const profile = await getTracefolioService().getProfile(user.userId);
  if (!profile) redirect("/onboarding");

  return (
    <div className="space-y-8">
      <DashboardNav active="/dashboard/profile" />
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#17211d]">Profile</h1>
        <p className="mt-2 text-sm text-[#526159]">
          This information can appear on your public portfolio once you choose to publish it.
        </p>
      </div>
      <ProfileEditor profile={profile} />
    </div>
  );
}
