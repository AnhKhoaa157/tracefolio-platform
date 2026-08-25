"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { PortfolioSettings } from "@/contracts/portfolio";
import { apiRequest, getMutationErrorMessage } from "@/lib/api-client";

import { ConfirmationDialog } from "./confirmation-dialog";
import { ErrorBanner, SuccessBanner } from "./field";

interface PortfolioVisibilityPanelProps {
  settings: PortfolioSettings;
}

type ActionState =
  | { status: "idle" }
  | { status: "publishing" }
  | { status: "unpublishing" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type CopyState = "idle" | "copied" | "error";

export function PortfolioVisibilityPanel({ settings }: PortfolioVisibilityPanelProps) {
  const router = useRouter();
  const [actionState, setActionState] = useState<ActionState>({ status: "idle" });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [absolutePublicUrl, setAbsolutePublicUrl] = useState<string | null>(null);

  const isSubmitting = actionState.status === "publishing" || actionState.status === "unpublishing";

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setAbsolutePublicUrl(new URL(settings.publicUrl, window.location.origin).toString());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [settings.publicUrl]);

  function openPublishConfirmation() {
    if (settings.isPublic || isSubmitting) return;
    setActionState({ status: "idle" });
    setPublishDialogOpen(true);
  }

  async function handlePublish() {
    if (settings.isPublic || isSubmitting) return;

    try {
      setActionState({ status: "publishing" });
      await apiRequest<{ ok: true }>("/api/portfolio/publish", { method: "POST" });
      setPublishDialogOpen(false);
      setActionState({ status: "success", message: "Portfolio published." });
      router.refresh();
    } catch (error) {
      setPublishDialogOpen(false);
      setActionState({ status: "error", message: getMutationErrorMessage(error) });
    }
  }

  async function handleUnpublish() {
    if (!settings.isPublic || isSubmitting) return;

    try {
      setActionState({ status: "unpublishing" });
      await apiRequest<{ ok: true }>("/api/portfolio/unpublish", { method: "POST" });
      setActionState({ status: "success", message: "Portfolio unpublished and private again." });
      router.refresh();
    } catch (error) {
      setActionState({ status: "error", message: getMutationErrorMessage(error) });
    }
  }

  async function handleCopyUrl() {
    try {
      const publicUrl = new URL(settings.publicUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(publicUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section
      aria-labelledby="portfolio-visibility-heading"
      className="rounded-[1.75rem] border border-[#cbd2cc] bg-white/50 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#87938a]">Portfolio</p>
          <h2 id="portfolio-visibility-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17211d]">
            Portfolio visibility
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526159]">
            {settings.isPublic
              ? "Your portfolio is public. Anyone with the link can view your public profile and published Achievements."
              : "Your portfolio is private. Publishing it is an explicit choice, and private content stays hidden."}
          </p>
        </div>
        <span
          className={
            settings.isPublic
              ? "rounded-full bg-[#d6e8df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1f5138]"
              : "rounded-full border border-[#b7c0b9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#526159]"
          }
        >
          {settings.isPublic ? "Public" : "Private"}
        </span>
      </div>

      {settings.isPublic ? (
        <div className="mt-6 rounded-2xl border border-[#b7c0b9] bg-[#f4f0e8] p-4">
          <label htmlFor="public-portfolio-url" className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#87938a]">
            Public URL
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="public-portfolio-url"
              value={absolutePublicUrl ?? ""}
              readOnly
              aria-label="Public portfolio URL"
              aria-busy={absolutePublicUrl === null}
              placeholder={absolutePublicUrl === null ? "Preparing shareable URL…" : undefined}
              className="min-w-0 flex-1 rounded-2xl border border-[#b7c0b9] bg-white/70 px-4 py-3 text-sm text-[#17211d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17211d]"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="rounded-full border border-[#b7c0b9] px-5 py-2.5 text-sm font-semibold text-[#17211d] transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8]"
            >
              {copyState === "copied" ? "Copied" : "Copy URL"}
            </button>
          </div>
          {copyState === "error" ? (
            <p className="mt-2 text-sm text-[#7a3b23]">Select the URL above and copy it manually.</p>
          ) : null}
          <a
            href={settings.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-[#17211d] underline underline-offset-2"
          >
            Open public portfolio ↗
          </a>
        </div>
      ) : null}

      {actionState.status === "error" ? <div className="mt-5"><ErrorBanner>{actionState.message}</ErrorBanner></div> : null}
      {actionState.status === "success" ? (
        <div className="mt-5"><SuccessBanner>{actionState.message}</SuccessBanner></div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {settings.isPublic ? (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isSubmitting}
            aria-busy={actionState.status === "unpublishing"}
            className="rounded-full border-2 border-[#a24a34] px-5 py-2.5 text-sm font-semibold text-[#7a3b23] transition hover:bg-[#fbeae3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionState.status === "unpublishing" ? "Unpublishing…" : "Unpublish portfolio"}
          </button>
        ) : (
          <button
            type="button"
            onClick={openPublishConfirmation}
            disabled={isSubmitting}
            aria-busy={actionState.status === "publishing"}
            className="rounded-full bg-[#17211d] px-5 py-2.5 text-sm font-semibold text-[#f4f0e8] transition hover:bg-[#2c3b33] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Publish portfolio
          </button>
        )}
        <p className="text-sm text-[#87938a]">
          {settings.isPublic
            ? "Unpublishing takes effect immediately."
            : "Only published Achievements will appear when the portfolio is public."}
        </p>
      </div>

      <ConfirmationDialog
        open={publishDialogOpen}
        title="Publish your portfolio?"
        description={
          <>
            <p>Your portfolio will be visible to anyone with its public URL.</p>
            <p className="mt-2">Only your public profile fields and PUBLIC Achievements will be shown.</p>
          </>
        }
        confirmLabel="Publish portfolio"
        confirmingLabel="Publishing…"
        isConfirming={actionState.status === "publishing"}
        onConfirm={handlePublish}
        onCancel={() => setPublishDialogOpen(false)}
      />
    </section>
  );
}
