"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmingLabel: string;
  isConfirming: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmingLabel,
  isConfirming,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isConfirmingRef = useRef(isConfirming);
  const onCancelRef = useRef(onCancel);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    isConfirmingRef.current = isConfirming;
    onCancelRef.current = onCancel;
  }, [isConfirming, onCancel]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => confirmRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isConfirmingRef.current) onCancelRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17211d]/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-[1.75rem] border border-[#cbd2cc] bg-[#f4f0e8] p-6 shadow-2xl sm:p-8"
      >
        <h2 id={titleId} className="text-xl font-semibold tracking-[-0.03em] text-[#17211d]">
          {title}
        </h2>
        <div id={descriptionId} className="mt-3 text-sm leading-6 text-[#526159]">
          {description}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-full border border-[#b7c0b9] px-5 py-2.5 text-sm font-medium text-[#526159] transition hover:border-[#17211d] hover:text-[#17211d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming}
            className={
              destructive
                ? "rounded-full bg-[#7a3b23] px-5 py-2.5 text-sm font-semibold text-[#f4f0e8] transition hover:bg-[#642f1d] disabled:cursor-not-allowed disabled:opacity-60"
                : "rounded-full bg-[#17211d] px-5 py-2.5 text-sm font-semibold text-[#f4f0e8] transition hover:bg-[#2c3b33] disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
