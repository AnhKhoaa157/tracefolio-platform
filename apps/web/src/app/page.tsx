import Link from "next/link";

const evidenceCards = [
  {
    number: "01",
    title: "Capture the work",
    copy: "Turn projects, launches, experiments, and lessons learned into structured evidence.",
    accent: "bg-[#d6e8df]",
  },
  {
    number: "02",
    title: "Connect the skills",
    copy: "Show the skills behind each outcome instead of leaving experience as a list of claims.",
    accent: "bg-[#f0dcc5]",
  },
  {
    number: "03",
    title: "Share the story",
    copy: "Publish one calm, credible portfolio that is ready for a recruiter, a client, or your future self.",
    accent: "bg-[#dfe2f2]",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-between px-6 pb-16 pt-7 lg:px-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="Tracefolio home">
            <span className="grid size-9 place-items-center rounded-full bg-[#17211d] text-sm font-semibold text-[#f4f0e8]">
              T
            </span>
            <span className="text-lg font-semibold tracking-[-0.04em]">tracefolio</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-[#526159] md:flex">
            <a href="#why" className="transition hover:text-[#17211d]">Why Tracefolio</a>
            <a href="#method" className="transition hover:text-[#17211d]">Method</a>
            <a href="#principles" className="transition hover:text-[#17211d]">Principles</a>
          </div>
          <a
            href="/p/demo"
            className="rounded-full border border-[#b7c0b9] px-4 py-2 text-sm font-medium transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8]"
          >
            View a sample
          </a>
        </nav>

        <div className="grid items-end gap-14 py-20 lg:grid-cols-[1.06fr_0.94fr] lg:py-28">
          <div>
            <p className="mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#76857c]">
              Evidence-first career identity
            </p>
            <h1 className="max-w-4xl text-6xl font-semibold leading-[0.94] tracking-[-0.075em] text-[#17211d] sm:text-7xl lg:text-[7.5rem]">
              Your work,
              <br />
              made visible.
            </h1>
            <p className="mt-9 max-w-xl text-lg leading-8 text-[#526159]">
              Tracefolio helps you build a career portfolio from real outcomes,
              supporting files, and the skills that made the work possible.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/p/demo"
                className="rounded-full bg-[#17211d] px-6 py-3.5 text-sm font-semibold text-[#f4f0e8] transition hover:-translate-y-0.5 hover:bg-[#2c3b33]"
              >
                Explore the product <span aria-hidden="true">↗</span>
              </a>
              <a href="#method" className="px-2 py-3.5 text-sm font-semibold text-[#526159] transition hover:text-[#17211d]">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mb-4">
            <div className="absolute -right-5 -top-9 size-28 rounded-full border border-[#c7d0c7] sm:-right-10" />
            <div className="relative rounded-[2rem] bg-[#17211d] p-5 text-[#f4f0e8] shadow-2xl shadow-[#17211d]/15 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/15 pb-5 text-xs text-[#bdc8c0]">
                <span>TRACEFOLIO / PROFILE</span>
                <span className="rounded-full border border-white/20 px-3 py-1">PUBLIC</span>
              </div>
              <div className="py-12">
                <div className="mb-6 flex items-center gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl bg-[#e9b86f] text-2xl font-semibold text-[#17211d]">A</div>
                  <div>
                    <p className="text-xl font-semibold tracking-[-0.04em]">Alex Nguyen</p>
                    <p className="mt-1 text-sm text-[#bdc8c0]">Product designer · Ho Chi Minh City</p>
                  </div>
                </div>
                <p className="max-w-xs text-2xl leading-tight tracking-[-0.04em]">
                  I make complex products feel clear, useful, and human.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">12</p>
                  <p className="mt-1 text-xs text-[#bdc8c0]">documented outcomes</p>
                </div>
                <div className="rounded-2xl bg-[#e9b86f] p-4 text-[#17211d]">
                  <p className="text-2xl font-semibold">24</p>
                  <p className="mt-1 text-xs text-[#526159]">connected skills</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-[#87938a]">A portfolio with receipts</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#cbd2cc] pt-5 text-xs uppercase tracking-[0.18em] text-[#87938a]">
          <span>Build from evidence</span>
          <span className="hidden sm:inline">01 — 03</span>
          <span>Tracefolio / 2026</span>
        </div>
      </section>

      <section id="why" className="bg-[#17211d] px-6 py-24 text-[#f4f0e8] lg:px-10 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9cac9f]">The problem</p>
            <div>
              <h2 className="max-w-4xl text-4xl leading-tight tracking-[-0.06em] sm:text-6xl">
                A résumé says what you were called. Evidence shows what you changed.
              </h2>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-[#bdc8c0]">
                Important work is scattered across documents, drives, chats, and memories.
                Tracefolio gives it a durable home without turning your career into a noisy feed.
              </p>
            </div>
          </div>
          <div id="method" className="mt-20 grid gap-4 md:grid-cols-3">
            {evidenceCards.map((card) => (
              <article key={card.number} className={`${card.accent} min-h-64 rounded-[1.75rem] p-6 text-[#17211d]`}>
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold">{card.number}</span>
                  <span aria-hidden="true" className="text-2xl">↗</span>
                </div>
                <div className="mt-24">
                  <h3 className="text-2xl font-semibold tracking-[-0.05em]">{card.title}</h3>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-[#526159]">{card.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <h2 className="text-5xl leading-[0.98] tracking-[-0.07em] sm:text-7xl">Quiet by design.<br />Credible by default.</h2>
          <div className="space-y-8 lg:pt-3">
            <div className="border-t border-[#cbd2cc] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#87938a]">01 / Ownership</p>
              <p className="mt-3 text-lg leading-8 text-[#526159]">You own the narrative, the evidence, and the decision to make each achievement public.</p>
            </div>
            <div className="border-t border-[#cbd2cc] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#87938a]">02 / Context</p>
              <p className="mt-3 text-lg leading-8 text-[#526159]">Every outcome can carry its situation, contribution, impact, skills, and supporting attachments.</p>
            </div>
            <div className="border-t border-[#cbd2cc] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#87938a]">03 / Control</p>
              <p className="mt-3 text-lg leading-8 text-[#526159]">Private is the safe default. Publishing is an explicit action, and unpublishing is always available.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-[#cbd2cc] px-6 py-8 text-sm text-[#87938a] sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p>Tracefolio — a living record of useful work.</p>
        <span className="text-[#526159]">Evidence, context, ownership.</span>
      </footer>
    </main>
  );
}
