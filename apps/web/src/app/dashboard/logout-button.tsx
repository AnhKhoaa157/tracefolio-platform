"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      router.push("/sign-in");
    } catch {
      setError("Sign out failed. Please try again.");
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-busy={isLoggingOut}
        className="rounded-full border border-[#b7c0b9] px-4 py-2 text-sm font-medium text-[#17211d] transition hover:border-[#17211d] hover:bg-[#17211d] hover:text-[#f4f0e8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? "Signing out…" : "Sign out"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-[#a24a34]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
