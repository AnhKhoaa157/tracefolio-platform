import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  betaNotice: ReactNode;
  children: ReactNode;
}

export function LegalPage({ eyebrow, title, lastUpdated, betaNotice, children }: LegalPageProps) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 lg:px-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#526159] transition hover:text-[#17211d]"
      >
        <span aria-hidden="true">←</span> Back to Tracefolio
      </Link>

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-[#76857c]">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#17211d] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-sm text-[#87938a]">Last updated: {lastUpdated}</p>

      <div className="mt-6 rounded-2xl bg-[#f0dcc5] p-5 text-sm leading-6 text-[#17211d]">
        <p className="font-semibold">Development / beta document</p>
        <p className="mt-1">{betaNotice}</p>
      </div>

      <div className="mt-12 space-y-10 text-base leading-7">{children}</div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#17211d]">{heading}</h2>
      <div className="mt-3 space-y-3 text-[#526159]">{children}</div>
    </section>
  );
}

export function TodoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-xl border border-dashed border-[#e3b6a4] bg-[#fbeae3] px-4 py-3 text-sm leading-6 text-[#7a3b23]">
      <span className="font-semibold uppercase tracking-[0.12em]">TODO (product owner): </span>
      {children}
    </p>
  );
}
