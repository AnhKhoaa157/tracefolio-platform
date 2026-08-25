import { DatabaseFailure } from "../db/errors";
import { DomainError } from "../domain/errors";
import { AuthFailure } from "../auth/errors";
import type { ApiErrorBody } from "@/contracts/portfolio";

export interface SafeApiError {
  code: string;
  message: string;
  status: number;
}

export function buildApiErrorBody(
  error: unknown,
  requestId: string,
): { body: ApiErrorBody; status: number } {
  const safeError = toSafeApiError(error);
  return {
    body: {
      code: safeError.code,
      message: safeError.message,
      request_id: requestId,
    },
    status: safeError.status,
  };
}

export function toSafeApiError(error: unknown): SafeApiError {
  if (error instanceof AuthFailure) {
    return { code: error.code, message: error.message, status: error.status };
  }

  if (error instanceof DomainError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  if (error instanceof DatabaseFailure) {
    if (error.code === "DATABASE_CONSTRAINT") {
      return {
        code: "CONFLICT",
        message: "The request conflicts with existing data.",
        status: 409,
      };
    }

    return {
      code: "DATABASE_UNAVAILABLE",
      message: "The service is temporarily unavailable.",
      status: 503,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
    status: 500,
  };
}
