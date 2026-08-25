export type DomainErrorCode =
  | "CONFLICT"
  | "CONSENT_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INVALID_STATE"
  | "NOT_FOUND"
  | "PUBLISH_REQUIRES_SKILL"
  | "UNAUTHENTICATED";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;

  constructor(code: DomainErrorCode, message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}

export function invalidInput(message: string): DomainError {
  return new DomainError("INVALID_INPUT", message, 400);
}

export function notFound(message = "The requested resource was not found."): DomainError {
  return new DomainError("NOT_FOUND", message, 404);
}

export function forbidden(message = "You do not have permission to modify this resource."): DomainError {
  return new DomainError("FORBIDDEN", message, 403);
}

export function conflict(message: string): DomainError {
  return new DomainError("CONFLICT", message, 409);
}

export function invalidState(message: string): DomainError {
  return new DomainError("INVALID_STATE", message, 409);
}

export function publishRequiresSkill(): DomainError {
  return new DomainError(
    "PUBLISH_REQUIRES_SKILL",
    "At least one Skill is required before publishing an achievement.",
    422,
  );
}

export function consentRequired(): DomainError {
  return new DomainError(
    "CONSENT_REQUIRED",
    "Current legal consent is required before changing portfolio data.",
    403,
  );
}
