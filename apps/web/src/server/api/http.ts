import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { invalidInput } from "../domain/errors";
import { isRecord } from "../domain/validation";
import { buildApiErrorBody } from "./errors";

const MAX_JSON_BODY_BYTES = 256 * 1024;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type ApiHandler = (requestId: string) => Promise<Response>;

export async function handleApiRequest(request: NextRequest, handler: ApiHandler): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    return await handler(requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}

export function jsonResponse<T>(body: T, status = 200): Response {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function apiErrorResponse(error: unknown, requestId: string): Response {
  const { body, status } = buildApiErrorBody(error, requestId);

  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    throw invalidInput("Request body is too large.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw invalidInput("Request body must be valid JSON.");
  }

  if (!isRecord(body)) throw invalidInput("Request body must be a JSON object.");
  return body;
}

function getRequestId(request: Request): string {
  const candidate = request.headers.get("x-request-id")?.trim();
  if (candidate && REQUEST_ID_PATTERN.test(candidate)) return candidate;
  return crypto.randomUUID();
}
