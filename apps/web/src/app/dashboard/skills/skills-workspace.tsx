"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { CreateSkillRequest, Skill, UpdateSkillRequest } from "@/contracts/portfolio";
import { apiRequest, getErrorMessage } from "@/lib/api-client";

import { ErrorBanner, Field, inputClassName } from "../_components/field";

interface SkillsWorkspaceProps {
  skills: Skill[];
}

type FormState = { status: "idle" } | { status: "submitting" } | { status: "error"; message: string };

export function SkillsWorkspace({ skills }: SkillsWorkspaceProps) {
  const router = useRouter();

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createState, setCreateState] = useState<FormState>({ status: "idle" });
  const [createFieldError, setCreateFieldError] = useState<string | undefined>();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editState, setEditState] = useState<FormState>({ status: "idle" });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createState.status === "submitting") return;

    if (!createName.trim()) {
      setCreateFieldError("A name is required.");
      return;
    }
    setCreateFieldError(undefined);

    try {
      setCreateState({ status: "submitting" });
      await apiRequest<{ skill: Skill }>("/api/skills", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() === "" ? null : createDescription.trim(),
        } satisfies CreateSkillRequest),
      });
      setCreateName("");
      setCreateDescription("");
      setCreateState({ status: "idle" });
      router.refresh();
    } catch (error) {
      setCreateState({ status: "error", message: getErrorMessage(error) });
    }
  }

  function startEdit(skill: Skill) {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditDescription(skill.description ?? "");
    setEditState({ status: "idle" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ status: "idle" });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>, skillId: string) {
    event.preventDefault();
    if (editState.status === "submitting") return;

    if (!editName.trim()) {
      setEditState({ status: "error", message: "A name is required." });
      return;
    }

    try {
      setEditState({ status: "submitting" });
      await apiRequest<{ skill: Skill }>(`/api/skills/${skillId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() === "" ? null : editDescription.trim(),
        } satisfies UpdateSkillRequest),
      });
      setEditingId(null);
      router.refresh();
    } catch (error) {
      setEditState({ status: "error", message: getErrorMessage(error) });
    }
  }

  const isCreating = createState.status === "submitting";
  const isEditing = editState.status === "submitting";

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        noValidate
        className="space-y-4 rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-[#17211d]">Add a Skill</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="skill-name" required error={createFieldError}>
            <input
              id="skill-name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              maxLength={80}
              disabled={isCreating}
              className={inputClassName}
            />
          </Field>
          <Field label="Description (optional)" htmlFor="skill-description">
            <input
              id="skill-description"
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              maxLength={1000}
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
          {isCreating ? "Adding…" : "Add Skill"}
        </button>
      </form>

      {skills.length === 0 ? (
        <p className="rounded-[1.75rem] border border-dashed border-[#cbd2cc] p-6 text-sm text-[#526159]">
          No Skills yet. Skills are required before an Achievement can later be published, so add the skills
          behind your work here first.
        </p>
      ) : (
        <ul className="space-y-3">
          {skills.map((skill) => (
            <li key={skill.id} className="rounded-2xl border border-[#cbd2cc] bg-white/50 p-5">
              {editingId === skill.id ? (
                <form onSubmit={(event) => handleEditSubmit(event, skill.id)} noValidate className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name" htmlFor={`edit-name-${skill.id}`} required>
                      <input
                        id={`edit-name-${skill.id}`}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        maxLength={80}
                        disabled={isEditing}
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="Description (optional)" htmlFor={`edit-description-${skill.id}`}>
                      <input
                        id={`edit-description-${skill.id}`}
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        maxLength={1000}
                        disabled={isEditing}
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                  {editState.status === "error" ? <ErrorBanner>{editState.message}</ErrorBanner> : null}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isEditing}
                      aria-busy={isEditing}
                      className="rounded-full bg-[#17211d] px-5 py-2.5 text-sm font-semibold text-[#f4f0e8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isEditing ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isEditing}
                      className="rounded-full border border-[#b7c0b9] px-5 py-2.5 text-sm font-medium text-[#526159] transition hover:border-[#17211d] hover:text-[#17211d]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#17211d]">{skill.name}</p>
                    {skill.description ? <p className="mt-1 text-sm text-[#526159]">{skill.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(skill)}
                    className="shrink-0 rounded-full border border-[#b7c0b9] px-4 py-2 text-sm font-medium text-[#17211d] transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8]"
                  >
                    Edit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
