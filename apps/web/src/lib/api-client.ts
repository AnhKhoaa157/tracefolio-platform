import type { ApiErrorBody } from "@/contracts/portfolio";

export class ApiRequestError extends Error {}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
