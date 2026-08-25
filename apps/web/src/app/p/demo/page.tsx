import Link from "next/link";

const achievements = [
  {
    title: "Reduced onboarding time by 38%",
    context: "B2B SaaS · 2025",
    outcome: "Reframed the first-run experience around the user’s job-to-be-done, then partnered with engineering to ship a measurable activation flow.",
    skills: ["Product strategy", "UX research", "Experimentation"],
  },
  {
    title: "Built a research practice from zero",
    context: "Platform team · 2024",
    outcome: "Created a lightweight cadence for customer interviews, synthesis, and decision records that the wider team could actually maintain.",
    skills: ["Systems thinking", "Facilitation", "Communication"],
  },
];

export default function DemoPortfolioPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8 lg:px-10">
      <nav className="flex items-center justify-between border-b border-[#cbd2cc] pb-6">
        <Link href="/" className="text-sm font-semibold text-[#526159] hover:text-[#17211d]">← Tracefolio</Link>
        <span className="rounded-full bg-[#d6e8df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#17211d]">Public portfolio</span>
      </nav>

      <header className="grid gap-10 border-b border-[#cbd2cc] py-20 md:grid-cols-[1fr_0.7fr] md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">Alex Nguyen · product designer</p>
          <h1 className="mt-5 max-w-3xl text-6xl font-semibold leading-[0.94] tracking-[-0.075em] text-[#17211d] sm:text-8xl">I make complex products feel clear, useful, and human.</h1>
        </div>
        <div className="md:pb-2">
          <p className="text-lg leading-8 text-[#526159]">A living record of the work, decisions, and skills behind the outcomes.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Product design", "Research", "Strategy"].map((skill) => <span key={skill} className="rounded-full border border-[#b7c0b9] px-3 py-1.5 text-sm text-[#526159]">{skill}</span>)}
          </div>
        </div>
      </header>

      <section className="py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#87938a]">Selected evidence</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#17211d]">What changed because I was there.</h2>
          </div>
          <span className="hidden text-sm text-[#87938a] sm:block">02 outcomes</span>
        </div>
        <div className="space-y-4">
          {achievements.map((achievement, index) => (
            <article key={achievement.title} className="grid gap-8 rounded-[1.75rem] bg-[#17211d] p-7 text-[#f4f0e8] md:grid-cols-[0.18fr_0.82fr] md:p-10">
              <span className="text-sm text-[#9cac9f]">0{index + 1}</span>
              <div>
                <p className="text-sm text-[#9cac9f]">{achievement.context}</p>
                <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl">{achievement.title}</h3>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#bdc8c0]">{achievement.outcome}</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {achievement.skills.map((skill) => <span key={skill} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-[#d6e0d8]">{skill}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-3 border-t border-[#cbd2cc] py-8 text-sm text-[#87938a] sm:flex-row sm:items-center sm:justify-between">
        <span>Built with Tracefolio</span>
        <span>Evidence, context, ownership.</span>
      </footer>
    </main>
  );
}
