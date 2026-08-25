import type { ReactNode } from "react";

export const inputClassName =
  "w-full rounded-2xl border border-[#b7c0b9] bg-white/70 px-4 py-3 text-sm text-[#17211d] transition placeholder:text-[#9aa39c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17211d] disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
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

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-[#e3b6a4] bg-[#fbeae3] p-4 text-sm text-[#7a3b23]">
      {children}
    </p>
  );
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-2xl border border-[#b7d3c1] bg-[#e6f1ea] p-4 text-sm text-[#1f5138]">
      {children}
    </p>
  );
}
