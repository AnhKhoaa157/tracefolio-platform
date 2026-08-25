"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { ChangeUsernameRequest, Profile, ProfileLink, UpdateProfileRequest } from "@/contracts/portfolio";
import { apiRequest, getErrorMessage } from "@/lib/api-client";

import { ErrorBanner, Field, inputClassName, SuccessBanner } from "../_components/field";

interface ProfileEditorProps {
  profile: Profile;
}

type SaveState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "success" };

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const router = useRouter();

  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [links, setLinks] = useState<ProfileLink[]>(profile.links);
  const [profileState, setProfileState] = useState<SaveState>({ status: "idle" });
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({});

  const [username, setUsername] = useState(profile.username);
  const [usernameState, setUsernameState] = useState<SaveState>({ status: "idle" });

  function updateLink(index: number, field: "label" | "url", value: string) {
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  }

  function addLink() {
    setLinks((current) => (current.length >= 10 ? current : [...current, { label: "", url: "" }]));
  }

  function removeLink(index: number) {
    setLinks((current) => current.filter((_, i) => i !== index));
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileState.status === "submitting") return;

    const cleanedLinks = links.map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
    const errors: Record<number, string> = {};
    cleanedLinks.forEach((link, index) => {
      if (Boolean(link.label) !== Boolean(link.url)) {
        errors[index] = "Both a label and a URL are required for this link.";
      }
    });
    setLinkErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const finalLinks = cleanedLinks.filter((link) => link.label && link.url);

    try {
      setProfileState({ status: "submitting" });
      await apiRequest<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          headline: headline.trim() === "" ? null : headline.trim(),
          bio: bio.trim() === "" ? null : bio.trim(),
          location: location.trim() === "" ? null : location.trim(),
          avatarUrl: avatarUrl.trim() === "" ? null : avatarUrl.trim(),
          links: finalLinks,
        } satisfies UpdateProfileRequest),
      });
      setProfileState({ status: "success" });
      router.refresh();
    } catch (error) {
      setProfileState({ status: "error", message: getErrorMessage(error) });
    }
  }

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (usernameState.status === "submitting") return;

    const trimmed = username.trim();
    if (!trimmed || trimmed === profile.username) return;

    try {
      setUsernameState({ status: "submitting" });
      await apiRequest<{ profile: Profile }>("/api/profile/username", {
        method: "PATCH",
        body: JSON.stringify({ username: trimmed } satisfies ChangeUsernameRequest),
      });
      setUsernameState({ status: "success" });
      router.refresh();
    } catch (error) {
      setUsernameState({ status: "error", message: getErrorMessage(error) });
    }
  }

  const isProfileSubmitting = profileState.status === "submitting";
  const isUsernameSubmitting = usernameState.status === "submitting";

  return (
    <div className="space-y-10">
      <form
        onSubmit={handleProfileSubmit}
        noValidate
        className="space-y-6 rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-[#17211d]">Profile details</h2>

        <Field label="Headline" htmlFor="headline">
          <input
            id="headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={160}
            disabled={isProfileSubmitting}
            className={inputClassName}
          />
        </Field>

        <Field label="Bio" htmlFor="bio">
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={4000}
            rows={4}
            disabled={isProfileSubmitting}
            className={inputClassName}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Location" htmlFor="location">
            <input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={160}
              disabled={isProfileSubmitting}
              className={inputClassName}
            />
          </Field>
          <Field label="Avatar URL" htmlFor="avatarUrl">
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://…"
              disabled={isProfileSubmitting}
              className={inputClassName}
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="block text-sm font-medium text-[#17211d]">Links</span>
            <button
              type="button"
              onClick={addLink}
              disabled={links.length >= 10 || isProfileSubmitting}
              className="text-sm font-medium text-[#526159] transition hover:text-[#17211d] disabled:opacity-50"
            >
              + Add link
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {links.length === 0 ? <p className="text-sm text-[#87938a]">No links added yet.</p> : null}
            {links.map((link, index) => (
              <div key={index} className="flex flex-wrap items-start gap-3">
                <input
                  aria-label={`Link ${index + 1} label`}
                  value={link.label}
                  onChange={(event) => updateLink(index, "label", event.target.value)}
                  placeholder="Label"
                  disabled={isProfileSubmitting}
                  className={`${inputClassName} sm:w-40`}
                />
                <input
                  aria-label={`Link ${index + 1} URL`}
                  value={link.url}
                  onChange={(event) => updateLink(index, "url", event.target.value)}
                  placeholder="https://…"
                  disabled={isProfileSubmitting}
                  className={`${inputClassName} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  disabled={isProfileSubmitting}
                  className="shrink-0 rounded-full border border-[#b7c0b9] px-3 py-2 text-xs font-medium text-[#526159] transition hover:border-[#17211d] hover:text-[#17211d]"
                >
                  Remove
                </button>
                {linkErrors[index] ? (
                  <p role="alert" className="w-full text-sm text-[#a24a34]">
                    {linkErrors[index]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {profileState.status === "error" ? <ErrorBanner>{profileState.message}</ErrorBanner> : null}
        {profileState.status === "success" ? <SuccessBanner>Profile saved.</SuccessBanner> : null}

        <button
          type="submit"
          disabled={isProfileSubmitting}
          aria-busy={isProfileSubmitting}
          className="rounded-full bg-[#17211d] px-6 py-3 text-sm font-semibold text-[#f4f0e8] transition hover:-translate-y-0.5 hover:bg-[#2c3b33] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProfileSubmitting ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form
        onSubmit={handleUsernameSubmit}
        noValidate
        className="space-y-4 rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-[#17211d]">Username</h2>
        <p className="text-sm text-[#526159]">Your username appears in your public portfolio URL.</p>
        <Field label="Username" htmlFor="username">
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={32}
            disabled={isUsernameSubmitting}
            className={inputClassName}
          />
        </Field>
        {usernameState.status === "error" ? <ErrorBanner>{usernameState.message}</ErrorBanner> : null}
        {usernameState.status === "success" ? <SuccessBanner>Username updated.</SuccessBanner> : null}
        <button
          type="submit"
          disabled={isUsernameSubmitting || username.trim() === profile.username || username.trim() === ""}
          aria-busy={isUsernameSubmitting}
          className="rounded-full border border-[#b7c0b9] px-6 py-3 text-sm font-semibold text-[#17211d] transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUsernameSubmitting ? "Updating…" : "Update username"}
        </button>
      </form>
    </div>
  );
}
