export type DatabaseFailureCode =
  | "DATABASE_CONFIGURATION"
  | "DATABASE_CONSTRAINT"
  | "DATABASE_UNAVAILABLE";

export class DatabaseFailure extends Error {
  readonly code: DatabaseFailureCode;

  constructor(code: DatabaseFailureCode) {
    super("The data store could not complete the request.");
    this.name = "DatabaseFailure";
    this.code = code;
  }
}

export function normalizeDatabaseFailure(error: unknown): DatabaseFailure {
  if (error instanceof DatabaseFailure) return error;

  if (isPostgresError(error) && error.code === "23505") {
    return new DatabaseFailure("DATABASE_CONSTRAINT");
  }

  return new DatabaseFailure("DATABASE_UNAVAILABLE");
}

function isPostgresError(error: unknown): error is { code?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
