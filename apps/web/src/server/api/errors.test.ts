import { strict as assert } from "node:assert";
import test from "node:test";

import { DatabaseFailure } from "../db/errors";
import { DomainError, legalDocumentsUnavailable } from "../domain/errors";
import { buildApiErrorBody, toSafeApiError } from "./errors";

test("API errors expose a stable code/message/status without internal details", () => {
  const internal = new Error("postgresql://user:secret@example.test/db\n at internal stack");
  const result = toSafeApiError(internal);

  assert.deepEqual(result, {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
    status: 500,
  });
  assert.equal(JSON.stringify(result).includes("postgresql"), false);
  assert.equal(JSON.stringify(result).includes("internal stack"), false);
});

test("API errors preserve safe domain codes and database failures stay generic", () => {
  assert.deepEqual(
    toSafeApiError(new DomainError("PUBLISH_REQUIRES_SKILL", "At least one Skill is required.", 422)),
    {
      code: "PUBLISH_REQUIRES_SKILL",
      message: "At least one Skill is required.",
      status: 422,
    },
  );
  assert.deepEqual(toSafeApiError(new DatabaseFailure("DATABASE_UNAVAILABLE")), {
    code: "DATABASE_UNAVAILABLE",
    message: "The service is temporarily unavailable.",
    status: 503,
  });
  assert.deepEqual(toSafeApiError(legalDocumentsUnavailable()), {
    code: "LEGAL_DOCUMENTS_UNAVAILABLE",
    message: "The required legal documents are temporarily unavailable.",
    status: 503,
  });
});

test("API error bodies always include the request id", () => {
  const result = buildApiErrorBody(new Error("secret stack"), "request-123");

  assert.deepEqual(result, {
    body: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      request_id: "request-123",
    },
    status: 500,
  });
});
