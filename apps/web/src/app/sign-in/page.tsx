import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sign in — Tracefolio",
  description: "Sign in to Tracefolio with your GitHub account.",
};

export default async function SignInPage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect(user.onboardingComplete ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-[#17211d] text-sm font-semibold text-[#f4f0e8]">
        T
      </span>
      <h1 className="mt-8 text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#17211d] sm:text-5xl">
        Sign in to Tracefolio
      </h1>
      <p className="mt-4 max-w-sm text-base leading-7 text-[#526159]">
        Bring your work into one calm, evidence-first record. Continue with GitHub to sign in or create your
        account.
      </p>
      <a
        href="/api/auth/github"
        className="mt-10 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#17211d] px-6 py-3.5 text-sm font-semibold text-[#f4f0e8] transition hover:-translate-y-0.5 hover:bg-[#2c3b33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17211d]"
      >
        <GitHubMark />
        Continue with GitHub
      </a>
      <p className="mt-8 text-xs leading-5 text-[#87938a]">
        New here? You will be asked to review and accept the current Terms and Privacy Policy before your
        account is activated.
      </p>
    </main>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
