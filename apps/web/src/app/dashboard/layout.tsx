import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "./_lib/current-user";
import { LogoutButton } from "./logout-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

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
        <LogoutButton />
      </div>

      <div className="mt-8 space-y-8">{children}</div>
    </main>
  );
}
