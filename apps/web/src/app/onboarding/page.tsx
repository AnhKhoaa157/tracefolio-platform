import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/auth/session";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set up your Tracefolio",
  description: "Accept the current Terms and Privacy Policy and complete your profile.",
};

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  if (user.onboardingComplete) redirect("/dashboard");

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#76857c]">Set up your account</p>
      <h1 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#17211d] sm:text-5xl">
        A few essentials before you start.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[#526159]">
        Accept the current Terms and Privacy Policy, then add a headline and a short bio so your account can be
        activated.
      </p>
      <OnboardingForm initialUsername={user.username ?? ""} />
    </main>
  );
}
