import type { ApiErrorBody } from "@/contracts/portfolio";

export class ApiRequestError extends Error {
  readonly code: string | null;
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, options: { code?: string; status: number; requestId?: string }) {
    super(message);
    this.name = "ApiRequestError";
    this.code = options.code ?? null;
    this.status = options.status;
    this.requestId = options.requestId ?? null;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    let message = "The request failed. Please try again.";
    let code: string | undefined;
    let requestId: string | undefined;
    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      if (typeof body.message === "string" && body.message) message = body.message;
      if (typeof body.code === "string" && body.code) code = body.code;
      if (typeof body.request_id === "string" && body.request_id) requestId = body.request_id;
    } catch {
      // Response body was not JSON; keep the generic message.
    }
    throw new ApiRequestError(message, { code, requestId, status: response.status });
  }

  return (await response.json()) as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function getMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401 || error.code === "UNAUTHENTICATED") {
      return "Your session has expired. Sign in again to continue.";
    }
    if (error.code === "PUBLISH_REQUIRES_SKILL") {
      return "Link at least one Skill before publishing this Achievement.";
    }
    if (error.code === "CONSENT_REQUIRED") {
      return "Current legal consent is required before changing portfolio data.";
    }
  }

  return getErrorMessage(error);
}
