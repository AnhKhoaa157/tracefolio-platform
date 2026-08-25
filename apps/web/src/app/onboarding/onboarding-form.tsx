"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type { CompleteConsentRequest, ConsentCompletionResponse } from "@/contracts/auth";
import type { CurrentLegalDocumentsResponse, LegalDocumentMetadata } from "@/contracts/legal";
import type { ApiErrorBody, Profile, UpdateProfileRequest } from "@/contracts/portfolio";

interface OnboardingFormProps {
  initialUsername: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; terms: LegalDocumentMetadata; privacy: LegalDocumentMetadata };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting"; step: string }
  | { status: "error"; message: string }
  | { status: "success" };

class ApiRequestError extends Error {}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    let message = "The request failed. Please try again.";
    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      if (typeof body.message === "string" && body.message) message = body.message;
    } catch {
      // Response body was not JSON; keep the generic message.
    }
    throw new ApiRequestError(message);
  }

  return (await response.json()) as T;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function OnboardingForm({ initialUsername }: OnboardingFormProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  const [username, setUsername] = useState(initialUsername);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    apiRequest<CurrentLegalDocumentsResponse>("/api/legal-documents")
      .then((response) => {
        if (cancelled) return;
        const terms = response.documents.find((doc) => doc.documentType === "TERMS_OF_SERVICE");
        const privacy = response.documents.find((doc) => doc.documentType === "PRIVACY_POLICY");
        if (!terms || !privacy) {
          setLoadState({
            status: "error",
            message: "The current Terms and Privacy Policy are unavailable right now.",
          });
          return;
        }
        setLoadState({ status: "ready", terms, privacy });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadState({ status: "error", message: errorMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const isSubmitting = submitState.status === "submitting" || submitState.status === "success";

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!username.trim()) errors.username = "Username cannot be empty.";
    if (!headline.trim()) errors.headline = "A headline is required.";
    if (!bio.trim()) errors.bio = "A short bio is required.";
    if (!termsAccepted) errors.terms = "You must accept the Terms of Service.";
    if (!privacyAccepted) errors.privacy = "You must accept the Privacy Policy.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || loadState.status !== "ready") return;

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const { terms, privacy } = loadState;

    try {
      setSubmitState({ status: "submitting", step: "Recording your consent…" });
      await apiRequest<ConsentCompletionResponse>("/api/auth/consent", {
        method: "POST",
        body: JSON.stringify({
          terms: { documentId: terms.documentId, version: terms.version, accepted: true },
          privacy: { documentId: privacy.documentId, version: privacy.version, accepted: true },
        } satisfies CompleteConsentRequest),
      });

      setSubmitState({ status: "submitting", step: "Saving your profile…" });
      await apiRequest<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          headline: headline.trim(),
          bio: bio.trim(),
          location: location.trim() === "" ? null : location.trim(),
        } satisfies UpdateProfileRequest),
      });

      const trimmedUsername = username.trim();
      if (trimmedUsername !== initialUsername.trim()) {
        setSubmitState({ status: "submitting", step: "Updating your username…" });
        await apiRequest<{ profile: Profile }>("/api/profile/username", {
          method: "PATCH",
          body: JSON.stringify({ username: trimmedUsername }),
        });
      }

      setSubmitState({ status: "success" });
      router.push("/dashboard");
    } catch (error) {
      setSubmitState({ status: "error", message: errorMessage(error) });
    }
  }

  if (loadState.status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-12 rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-8 text-sm text-[#526159]"
      >
        Loading the current Terms and Privacy Policy…
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div
        role="alert"
        className="mt-12 rounded-[1.75rem] border border-[#e3b6a4] bg-[#fbeae3] p-8 text-sm text-[#7a3b23]"
      >
        <p>{loadState.message}</p>
        <button
          type="button"
          onClick={() => {
            setLoadState({ status: "loading" });
            setRetryCount((count) => count + 1);
          }}
          className="mt-4 rounded-full border border-[#7a3b23] px-4 py-2 text-sm font-semibold text-[#7a3b23] transition hover:bg-[#7a3b23] hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const { terms, privacy } = loadState;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-12 space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Username" htmlFor="username" required error={fieldErrors.username}>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? "username-error" : undefined}
            maxLength={32}
            className={inputClassName}
          />
        </Field>
        <Field label="Location (optional)" htmlFor="location">
          <input
            id="location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={isSubmitting}
            maxLength={160}
            className={inputClassName}
          />
        </Field>
      </div>

      <Field label="Headline" htmlFor="headline" required error={fieldErrors.headline}>
        <input
          id="headline"
          name="headline"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.headline)}
          aria-describedby={fieldErrors.headline ? "headline-error" : undefined}
          maxLength={160}
          placeholder="Product designer focused on evidence-first careers"
          className={inputClassName}
        />
      </Field>

      <Field label="Bio" htmlFor="bio" required error={fieldErrors.bio}>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.bio)}
          aria-describedby={fieldErrors.bio ? "bio-error" : undefined}
          maxLength={4000}
          rows={4}
          placeholder="A few sentences about the work you do and the outcomes you're proud of."
          className={inputClassName}
        />
      </Field>

      <fieldset className="space-y-4 rounded-[1.75rem] border border-[#cbd2cc] p-6">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#87938a]">Consent</legend>
        <ConsentCheckbox
          id="terms"
          checked={termsAccepted}
          onChange={setTermsAccepted}
          disabled={isSubmitting}
          error={fieldErrors.terms}
          label={
            <>
              I have read and accept the{" "}
              <a href={terms.contentUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Terms of Service
              </a>{" "}
              (v{terms.version}).
            </>
          }
        />
        <ConsentCheckbox
          id="privacy"
          checked={privacyAccepted}
          onChange={setPrivacyAccepted}
          disabled={isSubmitting}
          error={fieldErrors.privacy}
          label={
            <>
              I have read and accept the{" "}
              <a href={privacy.contentUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Privacy Policy
              </a>{" "}
              (v{privacy.version}).
            </>
          }
        />
      </fieldset>

      <div aria-live="polite" className="sr-only">
        {submitState.status === "submitting" ? submitState.step : null}
        {submitState.status === "success" ? "Setup complete. Redirecting…" : null}
      </div>

      {submitState.status === "error" ? (
        <div role="alert" className="rounded-2xl border border-[#e3b6a4] bg-[#fbeae3] p-4 text-sm text-[#7a3b23]">
          {submitState.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full rounded-full bg-[#17211d] px-6 py-3.5 text-sm font-semibold text-[#f4f0e8] transition hover:-translate-y-0.5 hover:bg-[#2c3b33] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitState.status === "submitting"
          ? submitState.step
          : submitState.status === "error"
            ? "Retry"
            : "Complete setup"}
      </button>
    </form>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#b7c0b9] bg-white/70 px-4 py-3 text-sm text-[#17211d] transition placeholder:text-[#9aa39c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17211d] disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[#17211d]">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-[#a24a34]">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-2 text-sm text-[#a24a34]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  label,
  error,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-6 text-[#526159]">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 size-4 rounded border-[#b7c0b9] text-[#17211d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17211d]"
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 pl-7 text-sm text-[#a24a34]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
