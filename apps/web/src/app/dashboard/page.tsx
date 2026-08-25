import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/auth/session";

import { LogoutButton } from "./logout-button";

export const metadata: Metadata = {
  title: "Dashboard — Tracefolio",
};

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

  const portfolioHref = user.username ? `/p/${user.username}` : null;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#cbd2cc] pb-8">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-full bg-[#17211d] text-lg font-semibold text-[#f4f0e8]">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold tracking-[-0.03em] text-[#17211d]">{user.displayName}</p>
            <p className="text-sm text-[#87938a]">{user.username ? `@${user.username}` : "No username yet"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-[#b7c0b9] bg-[#d6e8df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#17211d]">
            Onboarding complete
          </span>
          <LogoutButton />
        </div>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ComingSoonCard title="Profile" description="Headline, bio, and location." />
        <ComingSoonCard title="Skills" description="Skills behind your outcomes." />
        <ComingSoonCard title="Achievements" description="Draft and publish your evidence." />
        {portfolioHref ? (
          <Link
            href={portfolioHref}
            className="rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 transition hover:border-[#17211d] hover:bg-white/80"
          >
            <p className="text-lg font-semibold tracking-[-0.03em] text-[#17211d]">Portfolio</p>
            <p className="mt-2 text-sm text-[#526159]">View your public page.</p>
          </Link>
        ) : (
          <ComingSoonCard title="Portfolio" description="View your public page." />
        )}
      </section>
    </main>
  );
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-[#cbd2cc] p-6">
      <p className="text-lg font-semibold tracking-[-0.03em] text-[#17211d]">{title}</p>
      <p className="mt-2 text-sm text-[#526159]">{description}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#87938a]">Coming soon</p>
    </div>
  );
}
