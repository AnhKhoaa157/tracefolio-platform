"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Achievement, CreateAchievementRequest, Skill } from "@/contracts/portfolio";
import { apiRequest, getErrorMessage } from "@/lib/api-client";

import { ErrorBanner, Field, inputClassName } from "../_components/field";
import { AchievementCard } from "./achievement-card";

interface AchievementsWorkspaceProps {
  achievements: Achievement[];
  skills: Skill[];
}

type CreateState = { status: "idle" } | { status: "submitting" } | { status: "error"; message: string };

export function AchievementsWorkspace({ achievements, skills }: AchievementsWorkspaceProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [contribution, setContribution] = useState("");
  const [impact, setImpact] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [createState, setCreateState] = useState<CreateState>({ status: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const isCreating = createState.status === "submitting";

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "A title is required.";
    if (!summary.trim()) errors.summary = "A summary is required.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setCreateState({ status: "submitting" });
      const result = await apiRequest<{ achievement: Achievement }>("/api/achievements", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          context: context.trim() === "" ? null : context.trim(),
          contribution: contribution.trim() === "" ? null : contribution.trim(),
          impact: impact.trim() === "" ? null : impact.trim(),
          occurredAt: occurredAt === "" ? null : new Date(occurredAt).toISOString(),
        } satisfies CreateAchievementRequest),
      });
      setTitle("");
      setSummary("");
      setContext("");
      setContribution("");
      setImpact("");
      setOccurredAt("");
      setCreateState({ status: "idle" });
      setHighlightId(result.achievement.id);
      router.refresh();
    } catch (error) {
      setCreateState({ status: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        noValidate
        className="space-y-4 rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 sm:p-8"
      >
        <div>
          <h2 className="text-lg font-semibold text-[#17211d]">New Achievement</h2>
          <p className="mt-1 text-sm text-[#526159]">
            Always saved as a private Draft. You can link Skills once it&apos;s created.
          </p>
        </div>
        <Field label="Title" htmlFor="achievement-title" required error={fieldErrors.title}>
          <input
            id="achievement-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            disabled={isCreating}
            className={inputClassName}
          />
        </Field>
        <Field label="Summary" htmlFor="achievement-summary" required error={fieldErrors.summary}>
          <textarea
            id="achievement-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={2000}
            rows={3}
            disabled={isCreating}
            className={inputClassName}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Context (optional)" htmlFor="achievement-context">
            <textarea
              id="achievement-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={2000}
              rows={2}
              disabled={isCreating}
              className={inputClassName}
            />
          </Field>
          <Field label="Contribution (optional)" htmlFor="achievement-contribution">
            <textarea
              id="achievement-contribution"
              value={contribution}
              onChange={(event) => setContribution(event.target.value)}
              maxLength={2000}
              rows={2}
              disabled={isCreating}
              className={inputClassName}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Impact (optional)" htmlFor="achievement-impact">
            <textarea
              id="achievement-impact"
              value={impact}
              onChange={(event) => setImpact(event.target.value)}
              maxLength={2000}
              rows={2}
              disabled={isCreating}
              className={inputClassName}
            />
          </Field>
          <Field label="Occurred (optional)" htmlFor="achievement-occurredAt">
            <input
              id="achievement-occurredAt"
              type="date"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              disabled={isCreating}
              className={inputClassName}
            />
          </Field>
        </div>
        {createState.status === "error" ? <ErrorBanner>{createState.message}</ErrorBanner> : null}
        <button
          type="submit"
          disabled={isCreating}
          aria-busy={isCreating}
          className="rounded-full bg-[#17211d] px-6 py-3 text-sm font-semibold text-[#f4f0e8] transition hover:-translate-y-0.5 hover:bg-[#2c3b33] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? "Saving Draft…" : "Save Draft"}
        </button>
      </form>

      {achievements.length === 0 ? (
        <p className="rounded-[1.75rem] border border-dashed border-[#cbd2cc] p-6 text-sm text-[#526159]">
          No Achievements yet. Create your first draft above.
        </p>
      ) : (
        <ul className="space-y-4">
          {achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              allSkills={skills}
              defaultExpanded={achievement.id === highlightId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
