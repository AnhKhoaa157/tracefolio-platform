import type { NextRequest } from "next/server";

import type { ConsentCompletionResponse } from "@/contracts/auth";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { ConsentService } from "@/server/auth/consent";
import { requireAuthenticatedUserId } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const userId = await requireAuthenticatedUserId(request);
    const body = await readJsonObject(request);
    const { getConsentRepository } = await import("@/server/auth/consent-repository");
    const result = await new ConsentService(getConsentRepository()).complete({
      userId,
      terms: body.terms,
      privacy: body.privacy,
    });
    const response: ConsentCompletionResponse = {
      user: { status: result.status },
      consents: result.consents,
    };

    return jsonResponse(response);
  });
}
