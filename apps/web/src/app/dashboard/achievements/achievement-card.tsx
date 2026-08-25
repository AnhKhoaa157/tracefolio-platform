"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Achievement, Skill, UpdateAchievementRequest } from "@/contracts/portfolio";
import { apiRequest, getErrorMessage, getMutationErrorMessage } from "@/lib/api-client";

import { ConfirmationDialog } from "../_components/confirmation-dialog";
import { ErrorBanner, Field, inputClassName, SuccessBanner } from "../_components/field";

interface AchievementCardProps {
  achievement: Achievement;
  allSkills: Skill[];
  defaultExpanded?: boolean;
}

type EditState = { status: "idle" } | { status: "submitting" } | { status: "error"; message: string };
type LinkState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string; failures: string[] };
type VisibilityState =
  | { status: "idle" }
  | { status: "publishing" }
  | { status: "unpublishing" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function AchievementCard({ achievement, allSkills, defaultExpanded }: AchievementCardProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(achievement.title);
  const [summary, setSummary] = useState(achievement.summary);
  const [context, setContext] = useState(achievement.context ?? "");
  const [contribution, setContribution] = useState(achievement.contribution ?? "");
  const [impact, setImpact] = useState(achievement.impact ?? "");
  const [occurredAt, setOccurredAt] = useState(toDateInputValue(achievement.occurredAt));
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editState, setEditState] = useState<EditState>({ status: "idle" });

  const [linkerOpen, setLinkerOpen] = useState(Boolean(defaultExpanded));
  const linkedSkillIds = new Set(achievement.skills.map((skill) => skill.id));
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [linkState, setLinkState] = useState<LinkState>({ status: "idle" });
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({ status: "idle" });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const isEditSubmitting = editState.status === "submitting";
  const isLinking = linkState.status === "submitting";
  const isVisibilitySubmitting =
    visibilityState.status === "publishing" || visibilityState.status === "unpublishing";
  const canPublish = achievement.status === "DRAFT" || achievement.status === "PRIVATE";
  const hasLinkedSkills = achievement.skills.length > 0;

  function toggleSkillSelection(skillId: string) {
    setSelectedSkillIds((current) => {
      const next = new Set(current);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isEditSubmitting) return;

    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "A title is required.";
    if (!summary.trim()) errors.summary = "A summary is required.";
    setEditFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setEditState({ status: "submitting" });
      await apiRequest<{ achievement: Achievement }>(`/api/achievements/${achievement.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          context: context.trim() === "" ? null : context.trim(),
          contribution: contribution.trim() === "" ? null : contribution.trim(),
          impact: impact.trim() === "" ? null : impact.trim(),
          occurredAt: occurredAt === "" ? null : new Date(occurredAt).toISOString(),
        } satisfies UpdateAchievementRequest),
      });
      setIsEditing(false);
      setEditState({ status: "idle" });
      router.refresh();
    } catch (error) {
      setEditState({ status: "error", message: getErrorMessage(error) });
    }
  }

  async function handleLinkSubmit() {
    const toLink = Array.from(selectedSkillIds).filter((skillId) => !linkedSkillIds.has(skillId));
    if (toLink.length === 0 || isLinking) return;

    setLinkState({ status: "submitting" });
    const failures: string[] = [];

    for (const skillId of toLink) {
      try {
        await apiRequest<{ achievement: Achievement }>(`/api/achievements/${achievement.id}/skills`, {
          method: "POST",
          body: JSON.stringify({ skillId }),
        });
      } catch (error) {
        const skillName = allSkills.find((skill) => skill.id === skillId)?.name ?? skillId;
        failures.push(`${skillName}: ${getErrorMessage(error)}`);
      }
    }

    setSelectedSkillIds(new Set());
    if (failures.length > 0) {
      setLinkState({
        status: "error",
        message: "This Draft is unaffected, but some Skills could not be linked:",
        failures,
      });
    } else {
      setLinkState({ status: "idle" });
    }
    router.refresh();
  }

  function openPublishConfirmation() {
    if (!canPublish || !hasLinkedSkills || isVisibilitySubmitting) return;
    setVisibilityState({ status: "idle" });
    setPublishDialogOpen(true);
  }

  async function handlePublish() {
    if (!canPublish || !hasLinkedSkills || isVisibilitySubmitting) return;

    try {
      setVisibilityState({ status: "publishing" });
      await apiRequest<{ achievement: Achievement }>(`/api/achievements/${achievement.id}/publish`, {
        method: "POST",
      });
      setPublishDialogOpen(false);
      setVisibilityState({ status: "success", message: "Achievement published." });
      router.refresh();
    } catch (error) {
      setPublishDialogOpen(false);
      setVisibilityState({ status: "error", message: getMutationErrorMessage(error) });
    }
  }

  async function handleUnpublish() {
    if (achievement.status !== "PUBLIC" || isVisibilitySubmitting) return;

    try {
      setVisibilityState({ status: "unpublishing" });
      await apiRequest<{ achievement: Achievement }>(`/api/achievements/${achievement.id}/unpublish`, {
        method: "POST",
      });
      setVisibilityState({ status: "success", message: "Achievement unpublished and private again." });
      router.refresh();
    } catch (error) {
      setVisibilityState({ status: "error", message: getMutationErrorMessage(error) });
    }
  }

  return (
    <li className="rounded-2xl border border-[#cbd2cc] bg-white/50 p-6">
      {isEditing ? (
        <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
          <Field label="Title" htmlFor={`title-${achievement.id}`} required error={editFieldErrors.title}>
            <input
              id={`title-${achievement.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              disabled={isEditSubmitting}
              className={inputClassName}
            />
          </Field>
          <Field label="Summary" htmlFor={`summary-${achievement.id}`} required error={editFieldErrors.summary}>
            <textarea
              id={`summary-${achievement.id}`}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isEditSubmitting}
              className={inputClassName}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Context (optional)" htmlFor={`context-${achievement.id}`}>
              <textarea
                id={`context-${achievement.id}`}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                maxLength={2000}
                rows={2}
                disabled={isEditSubmitting}
                className={inputClassName}
              />
            </Field>
            <Field label="Contribution (optional)" htmlFor={`contribution-${achievement.id}`}>
              <textarea
                id={`contribution-${achievement.id}`}
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
                maxLength={2000}
                rows={2}
                disabled={isEditSubmitting}
                className={inputClassName}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Impact (optional)" htmlFor={`impact-${achievement.id}`}>
              <textarea
                id={`impact-${achievement.id}`}
                value={impact}
                onChange={(event) => setImpact(event.target.value)}
                maxLength={2000}
                rows={2}
                disabled={isEditSubmitting}
                className={inputClassName}
              />
            </Field>
            <Field label="Occurred (optional)" htmlFor={`occurredAt-${achievement.id}`}>
              <input
                id={`occurredAt-${achievement.id}`}
                type="date"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                disabled={isEditSubmitting}
                className={inputClassName}
              />
            </Field>
          </div>
          {editState.status === "error" ? <ErrorBanner>{editState.message}</ErrorBanner> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isEditSubmitting}
              aria-busy={isEditSubmitting}
              className="rounded-full bg-[#17211d] px-5 py-2.5 text-sm font-semibold text-[#f4f0e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isEditSubmitting}
              className="rounded-full border border-[#b7c0b9] px-5 py-2.5 text-sm font-medium text-[#526159] transition hover:border-[#17211d] hover:text-[#17211d]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#17211d]">{achievement.title}</p>
              <p className="mt-1 text-sm text-[#526159]">{achievement.summary}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#d6e8df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#17211d]">
              {achievement.status}
            </span>
          </div>

          {achievement.context || achievement.contribution || achievement.impact ? (
            <dl className="mt-4 grid gap-3 text-sm text-[#526159] sm:grid-cols-3">
              {achievement.context ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-[#87938a]">Context</dt>
                  <dd className="mt-1">{achievement.context}</dd>
                </div>
              ) : null}
              {achievement.contribution ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-[#87938a]">Contribution</dt>
                  <dd className="mt-1">{achievement.contribution}</dd>
                </div>
              ) : null}
              {achievement.impact ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-[#87938a]">Impact</dt>
                  <dd className="mt-1">{achievement.impact}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {achievement.skills.length === 0 ? (
              <span className="text-sm text-[#87938a]">No Skills linked yet.</span>
            ) : (
              achievement.skills.map((skill) => (
                <span key={skill.id} className="rounded-full border border-[#b7c0b9] px-3 py-1 text-xs text-[#526159]">
                  {skill.name}
                </span>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-[#b7c0b9] px-4 py-2 text-sm font-medium text-[#17211d] transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setLinkerOpen((open) => !open)}
              aria-expanded={linkerOpen}
              className="rounded-full border border-[#b7c0b9] px-4 py-2 text-sm font-medium text-[#17211d] transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8]"
            >
              {linkerOpen ? "Hide Skill linker" : "Link Skills"}
            </button>
            {canPublish ? (
              <button
                type="button"
                onClick={openPublishConfirmation}
                disabled={!hasLinkedSkills || isVisibilitySubmitting}
                aria-busy={visibilityState.status === "publishing"}
                aria-describedby={!hasLinkedSkills ? `publish-help-${achievement.id}` : undefined}
                className="rounded-full bg-[#17211d] px-4 py-2 text-sm font-semibold text-[#f4f0e8] transition hover:bg-[#2c3b33] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {visibilityState.status === "publishing" ? "Publishing…" : "Publish"}
              </button>
            ) : null}
            {achievement.status === "PUBLIC" ? (
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={isVisibilitySubmitting}
                aria-busy={visibilityState.status === "unpublishing"}
                className="rounded-full border border-[#a24a34] px-4 py-2 text-sm font-semibold text-[#7a3b23] transition hover:bg-[#fbeae3] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {visibilityState.status === "unpublishing" ? "Unpublishing…" : "Unpublish"}
              </button>
            ) : null}
          </div>

          {canPublish && !hasLinkedSkills ? (
            <p id={`publish-help-${achievement.id}`} className="mt-3 text-sm text-[#7a3b23]">
              Link at least one Skill before publishing this Achievement.
            </p>
          ) : null}
          {visibilityState.status === "error" ? <ErrorBanner>{visibilityState.message}</ErrorBanner> : null}
          {visibilityState.status === "success" ? <SuccessBanner>{visibilityState.message}</SuccessBanner> : null}

          {linkerOpen ? (
            <div className="mt-4 rounded-2xl border border-[#cbd2cc] bg-[#f4f0e8] p-4">
              {allSkills.length === 0 ? (
                <p className="text-sm text-[#526159]">
                  You don&apos;t have any Skills yet.{" "}
                  <a href="/dashboard/skills" className="underline underline-offset-2">
                    Add a Skill
                  </a>{" "}
                  first.
                </p>
              ) : (
                <>
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[#87938a]">
                      Skills
                    </legend>
                    {allSkills.map((skill) => {
                      const isLinked = linkedSkillIds.has(skill.id);
                      return (
                        <label key={skill.id} className="flex items-center gap-2 text-sm text-[#17211d]">
                          <input
                            type="checkbox"
                            checked={isLinked || selectedSkillIds.has(skill.id)}
                            disabled={isLinked || isLinking}
                            onChange={() => toggleSkillSelection(skill.id)}
                            className="size-4 rounded border-[#b7c0b9]"
                          />
                          {skill.name}
                          {isLinked ? <span className="text-xs text-[#87938a]">(linked)</span> : null}
                        </label>
                      );
                    })}
                  </fieldset>
                  {linkState.status === "error" ? (
                    <div className="mt-3 rounded-xl border border-[#e3b6a4] bg-[#fbeae3] p-3 text-sm text-[#7a3b23]">
                      <p>{linkState.message}</p>
                      <ul className="mt-1 list-disc pl-5">
                        {linkState.failures.map((failure) => (
                          <li key={failure}>{failure}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLinkSubmit}
                    disabled={isLinking || selectedSkillIds.size === 0}
                    aria-busy={isLinking}
                    className="mt-4 rounded-full bg-[#17211d] px-5 py-2.5 text-sm font-semibold text-[#f4f0e8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLinking ? "Linking…" : "Link selected Skills"}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </>
      )}
      <ConfirmationDialog
        open={publishDialogOpen}
        title="Publish this Achievement?"
        description={
          <>
            <p>This Achievement will become visible on your public portfolio.</p>
            <p className="mt-2">Anyone with the link can see its public-safe fields and linked Skill names.</p>
          </>
        }
        confirmLabel="Publish Achievement"
        confirmingLabel="Publishing…"
        isConfirming={visibilityState.status === "publishing"}
        onConfirm={handlePublish}
        onCancel={() => setPublishDialogOpen(false)}
      />
    </li>
  );
}

function toDateInputValue(occurredAt: string | null): string {
  if (!occurredAt) return "";
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
